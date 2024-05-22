require("dotenv").config();
const express = require("express");
const AppError = require("./utils/appError");

const errorController = require("./controllers/errorController");
const userRoutes = require("./routes/userRoutes");
const linkRoutes=require('./routes/linkRoutes')
const app = express();

app.use(express.json());

app.use("/api/v1/users", userRoutes);
app.use("/api/v1", linkRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`${req.originalUrl} not found!`, 404));
});

app.use(errorController);

module.exports = app;
