const crypto = require("crypto");
const multer = require("multer");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const AppError = require("../utils/appError");

const prisma = new PrismaClient();

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img/users");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `user-${req.user.user_id}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  const fileTypes = /png|jpeg|jpg|png/;
  const mimetype = fileTypes.test(file.mimetype.split("/")[1]);

  if (mimetype) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Error: File upload only supports the following filetypes - ${fileTypes}`
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const signToken = (userId, userEmail) => {
  return jwt.sign({ userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, msg) => {
  const token = signToken(user.user_id, user.email);

  const cookiesOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookiesOptions.secure = true;

  res.cookie("jwt", token, cookiesOptions);

  res.status(statusCode).json({
    status: "success",
    message: msg,
    token,
    data: {
      user,
    },
  });
};

const signUpController = catchAsync(async (req, res, next) => {
  const { full_name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      full_name,
      email,
      password: hashedPassword,
    },
    select: {
      user_id: true,
      full_name: true,
      email: true,
    },
  });

  const token = signToken(newUser.user_id, newUser.email);

  createSendToken(newUser, 201, res, "User created successfully!");
});

const loginController = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // check if user exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  // if user does not exist
  if (!existingUser) {
    return next(new AppError("User does not exist!", 404));
  }

  // check if password is correct
  const isPasswordCorrect = await bcrypt.compare(
    password,
    existingUser.password
  );

  // if password is incorrect
  if (!isPasswordCorrect) {
    return next(new AppError("Incorrect password!", 401));
  }

  const token = signToken(existingUser.user_id, existingUser.email);

  res.status(200).json({
    message: "User logged in successfully!",
    token,
    code: 200,
    data: {
      user: {
        user_id: existingUser.user_id,
        full_name: existingUser.full_name,
        email: existingUser.email,
      },
    },
  });
});

const protect = catchAsync(async (req, res, next) => {
  let token;
  // 1. get token check if token exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token)
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );

  // 2) verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: {
      user_id: decoded.userId,
    },
  });

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
  // 4) check if user changed password after the token was issued
  let isPasswordChanged;

  if (!currentUser.password_changed_at) {
    isPasswordChanged = false;
  } else {
    const changedPasswordDate = currentUser.password_changed_at;
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    isPasswordChanged = changedPasswordDate > tokenIssuedAt;
  }

  if (isPasswordChanged) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }
  // Grant access to protected route
  req.user = currentUser;
  next();
});

const allowTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

const forgotPasswordController = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required!", 400));
  }

  const currentUser = prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!currentUser) {
    return next(new AppError(`Email- ${email} does not exist!`, 404));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const tempPasswordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await prisma.user.updateMany({
    where: {
      email,
    },
    data: {
      password_reset_token: tempPasswordResetToken,
      password_reset_token_expires: new Date(
        new Date().getTime() + 10 * 60 * 1000
      ), // 10 minutes
    },
  });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a Patch request with your new password. to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email,
      subject: "Your password reset token (valid for 10 minutes)",
      message,
    });
  } catch (err) {
    await prisma.user.updateMany({
      where: {
        email,
      },
      data: {
        password_reset_token: null,
        password_reset_token_expires: null,
      },
    });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

  res.status(200).json({
    message: "Token sent to email!",
    code: 200,
  });
});

const resetPasswordController = catchAsync(async (req, res, next) => {
  //1 Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      password_reset_token: hashedToken,
      password_reset_token_expires: {
        gte: new Date(),
      },
    },
  });

  //2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or expired!", 400));
  }

  const { password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.updateMany({
    where: {
      user_id: user.user_id,
    },

    data: {
      password: hashedPassword,
      password_changed_at: new Date(new Date() - 1000),
      password_reset_token: null,
      password_reset_token_expires: null,
    },
  });
  //3) Update changedPasswordAt property for the user
  //4) Log the user in, send JWT
  const token = signToken(user.user_id, user.email);

  res.status(200).json({
    status: "success",
    message: "Password reset successful!",
    token,
  });
});

const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await prisma.user.findMany({
    select: {
      user_id: true,
      full_name: true,
      email: true,
      created_at: true,
      password_reset_token_expires: true,
    },
  });

  res.status(200).json({
    message: "Users fetched successfully!",
    code: 200,
    data: {
      users,
    },
  });
});

const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await prisma.user.findUnique({
    where: {
      user_id: req.user.user_id,
    },
  });

  // 2) Check if POSTed current password is correct
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return next(new AppError("Please provide current and new password!", 400));
  }

  const isPasswordCorrect = await bcrypt.compare(
    current_password,
    user.password
  );

  if (!isPasswordCorrect) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  const hashedPassword = await bcrypt.hash(new_password, 12);

  await prisma.user.updateMany({
    where: {
      user_id: req.user.user_id,
    },
    data: {
      password: hashedPassword,
      password_changed_at: new Date(new Date() - 1000),
    },
  });

  // 4) Log user in, send JWT
  const token = signToken(user.user_id, user.email);

  res.status(200).json({
    status: "success",
    message: "Password updated successfully!",
    token,
  });
});

const uploadUserPhoto = upload.single("user_photo");

const updateMe = catchAsync(async (req, res, next) => {
  const updatingFields = ["email", "full_name"];
  for (let key in req.body) {
    if (!updatingFields.includes(key)) {
      return next(new AppError(`This route is not for updating ${key}`, 400));
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      user_id: req.user.user_id,
    },
    data: {
      email: req.body.email,
      full_name: req.body.full_name,
    },
    select: {
      user_id: true,
      full_name: true,
      email: true,
    },
  });

  res.status(200).json({
    status: "success",
    message: "User updated successfully!",
    data: {
      user: updatedUser,
    },
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await prisma.user.update({
    where: {
      user_id: req.user.user_id,
    },
    data: {
      active: false,
    },
  });

  res.status(204).json({
    status: "success",
    message: "User deleted successfully!",
  });
});

module.exports = {
  signUpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  updatePassword,
  uploadUserPhoto,
  updateMe,
  deleteMe,
  getAllUsers,
  protect,
  allowTo,
};

//Compromised database
// 1. Strongly encrypted passwords with salt and hash (bcrypt)
// 2. Strongly encrypt password reset tokens (SHA 256)

// Brute force attack
// 1. Limit the number of requests to the server (express-rate-limit)
// 2. Use bcrypt to make login reqeusets slow
// 3. Implement maximum login attempts (express-mongo-sanitize)

// Cross-site scripting (XSS)
// 1. Use HTTP only cookies
// 2. Sanitize user input data (express-mongo-sanitize)
// 3. Use secure headers (helmet)

// Denial of service (DoS) attack
// 1. Limit the number of requests to the server (express-rate-limit)
// 2. Limit the size of the request body (express.json)
// 3. Use a reverse proxy (NGINX)
// 4. Avoid evil regular expressions (express-mongo-sanitize)
