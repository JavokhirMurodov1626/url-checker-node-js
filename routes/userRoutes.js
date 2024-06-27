const express = require("express");
const {
  signUpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  updatePassword,
  updateMe,
  deleteMe,
  protect,
  getAllUsers,
  uploadUserPhoto,
} = require("../controllers/authController");

const router = express.Router();

router.route("/signup").post(signUpController);
router.route("/login").post(loginController);
router.route("/forgot-password").post(forgotPasswordController);
router.route("/reset-password/:token").patch(resetPasswordController);
router.use(protect);
router.route("/update-password").patch(updatePassword);
router.route("/update-me").patch(uploadUserPhoto, updateMe);
router.route("/delete-me").delete(deleteMe);
router.route("/").get(getAllUsers);
module.exports = router;
