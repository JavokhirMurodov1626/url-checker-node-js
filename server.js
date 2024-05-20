const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.post("/signup", async (req, res) => {
  const { full_name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe manner
      if (e.code === "P2002") {
        res.status(500).json({
          message:
            "There is a unique constraint violation, a new user cannot be created with this email",
          code: 500,
        });
      }
    }
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // if user does not exist
    if (!existingUser) {
      res.status(400).json({
        message: "User not found!",
        code: 400,
      });
    }

    // check if password is correct
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );

    // if password is incorrect
    if (!isPasswordCorrect) {
      res.status(401).json({
        message: "Invalid password!",
        code: 400,
      });
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
  } catch (e) {
    res.status(500).json({
      message: "An error occurred while logging in",
      code: 500,
    });
  }
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
