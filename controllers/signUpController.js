const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const prisma = new PrismaClient();
const signUpController = catchAsync(async (req, res, next) => {
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

  const token = jwt.sign(
    { userId: existingUser.user_id, email: existingUser.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

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

module.exports = signUpController;
