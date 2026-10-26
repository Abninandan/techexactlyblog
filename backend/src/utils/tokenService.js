const { createHash, randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { RefreshToken } = require("../Model/Mongodb");

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const issueTokenPair = async (user) => {
	if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
		throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET must be configured");
	}

	const subject = user._id.toString();
	const accessToken = jwt.sign(
		{ sub: subject, email: user.email, tokenType: "access" },
		process.env.JWT_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
	);

	const refreshTokenId = randomUUID();
	const refreshToken = jwt.sign(
		{ sub: subject, tokenType: "refresh" },
		process.env.REFRESH_TOKEN_SECRET,
		{
			jwtid: refreshTokenId,
			expiresIn: process.env.REFRESH_TOKEN_TTL || "7d",
		}
	);
	const decodedToken = jwt.decode(refreshToken);
	if (!decodedToken || typeof decodedToken === "string" || !decodedToken.exp) {
		throw new Error("Could not determine refresh token expiration");
	}

	const storedToken = await RefreshToken.create({
		user: user._id,
		tokenHash: hashToken(refreshToken),
		expiresAt: new Date(decodedToken.exp * 1000),
	});

	return {
		accessToken,
		refreshToken,
		refreshTokenId: storedToken._id,
	};
};

module.exports = { hashToken, issueTokenPair };
