const { rateLimit } = require("express-rate-limit");

module.exports = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: { message: "Too many authentication requests. Try again later." },
});
