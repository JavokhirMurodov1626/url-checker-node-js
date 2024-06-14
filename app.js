require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
// const xss = require("xss");
const AppError = require("./utils/appError");

const errorController = require("./controllers/errorController");
const userRoutes = require("./routes/userRoutes");
const linkRoutes = require("./routes/linkRoutes");
const app = express();

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use(helmet());

app.use("/api", limiter);
//body parser, reading data from body into req.body
app.use(express.json());
// data sanitization against NoSQL query injection

// data sanitization against XSS
// app.use(xss());

app.use("/api/v1/users", userRoutes);
app.use("/api/v1", linkRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`${req.originalUrl} not found!`, 404));
});

app.use(errorController);

module.exports = app;
