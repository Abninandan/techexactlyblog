const express = require("express");
const {
	login,
	logout,
	refresh,
	register,
	requestPasswordReset,
	resetPassword,
} = require("../Controller/AuthController");
const authRateLimit = require("../Middleware/authRateLimit");

const router = express.Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/forgot-password", authRateLimit, requestPasswordReset);
router.post("/reset-password", authRateLimit, resetPassword);
router.post("/refresh", authRateLimit, refresh);
router.post("/logout", authRateLimit, logout);

module.exports = router;
