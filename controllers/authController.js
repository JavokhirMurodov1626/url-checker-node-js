const crypto = require("crypto");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const AppError = require("../utils/appError");

const prisma = new PrismaClient();

const signToken = (userId, userEmail) => {
  return jwt.sign({ userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
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

  res.status(201).json({
    message: "User created successfully!",
    token,
    code: 201,
    data: {
      user: newUser,
    },
  });
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
    console.log(changedPasswordDate);
    console.log(tokenIssuedAt);
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

const updatePasswordController = catchAsync(async (req, res, next) => {
  // 1) get the user
  const user = await prisma.user.findUnique({
    where: {
      user_id: req.user.user_id,
    },
  });

  //2) check password
  const { current_password, new_password, confirmed_password } = req.body;

  const isPasswordCorrect = await bcrypt.compare(
    current_password,
    user.password
  );

  if (!isPasswordCorrect) return next(new AppError("Incorrect password!", 401));

  //3) update password
  if (current_password === new_password)
    return next(
      new AppError(
        "New password cannot be the same as the current password!",
        400
      )
    );

  if (new_password !== confirmed_password)
    return next(new AppError("Passwords do not match!", 400));

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

  //4) log user in, send JWT

  const token = signToken(user.user_id, user.email);

  res.status(200).json({
    status: "success",
    message: "Password updated successfully!",
    token,
  });
});

module.exports = {
  signUpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  updatePasswordController,
  protect,
  allowTo,
};
