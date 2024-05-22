const express = require("express");
const signUpController = require("../controllers/signUpController");
const loginController = require("../controllers/loginController");
const router = express.Router();

router.route("/signup").post(signUpController);
router.route("/login").post(loginController);

module.exports = router;
