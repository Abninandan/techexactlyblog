const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User } = require("../Model/Mongodb");

const authenticateToken = async (req, res, next) => {
	const authorization = req.get("authorization");
	const [scheme, token] = authorization?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return res.status(401).json({ message: "Authentication required" });
	}

	if (!process.env.JWT_SECRET) {
		return next(new Error("JWT_SECRET is not configured"));
	}

	let payload;
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
	if (
		typeof payload === "string" ||
		payload.tokenType !== "access" ||
		typeof payload.sub !== "string" ||
		!mongoose.isValidObjectId(payload.sub)
	) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}

	try {
		const user = await User.findById(payload.sub).select("isActive");
		if (!user || !user.isActive) {
			return res.status(403).json({ message: "User account is inactive" });
		}

		req.user = payload;
		return next();
	} catch (error) {
		return next(error);
	}
};

module.exports = authenticateToken;
