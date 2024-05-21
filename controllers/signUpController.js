const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const catchAsync = require("../utils/catchAsync");

const prisma = new PrismaClient();
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

  const token = jwt.sign(
    { userId: newUser.user_id, email: newUser.email },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

  res.status(201).json({
    message: "User created successfully!",
    token,
    code: 201,
    data: {
      user: newUser,
    },
  });
});

module.exports = signUpController;
