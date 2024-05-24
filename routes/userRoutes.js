const express = require("express");
const {
  signUpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  getAllUsers
} = require("../controllers/authController");

const router = express.Router();

router.route("/signup").post(signUpController);
router.route("/login").post(loginController);
router.route("/forgot-password").post(forgotPasswordController);
router.route("/reset-password/:token").patch(resetPasswordController);
router.route('/').get(getAllUsers)
module.exports = router;
