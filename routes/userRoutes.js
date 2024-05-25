const express = require("express");
const {
  signUpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  updatePasswordController,
  protect,
} = require("../controllers/authController");

const router = express.Router();

router.route("/signup").post(signUpController);
router.route("/login").post(loginController);
router.route("/forgot-password").post(forgotPasswordController);
router.route("/reset-password/:token").patch(resetPasswordController);
router.route("/update-password").patch(protect, updatePasswordController);
module.exports = router;
