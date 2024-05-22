const AppError = require("../utils/appError");

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send messager to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    //1) log error
    console.log("Error", err);

    //2) send generic message
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const handlePrismaErrors = (err) => {
  if (err.code === "P2002") {
    let customError = new AppError(
      `${err.meta.target[0]} already exists. Please use another ${err.meta.target[0]}`,
      400
    );
    return customError;
  } else if ((err.name = "JsonWebTokenError")) {
    return new AppError("Invalid token. Please log in again!", 401);
  }
};

const errorController = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    const modifiedError = handlePrismaErrors(err);
    sendErrorProd(modifiedError, res);
  }
};

module.exports = errorController;
