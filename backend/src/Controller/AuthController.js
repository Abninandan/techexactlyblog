const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { PasswordResetToken, RefreshToken, Role, User, UserRole } = require("../Model/Mongodb");
const { hashToken, issueTokenPair } = require("../utils/tokenService");
const { sendMail } = require("../utils/mailService");

const register = async (req, res) => {
	const { name, email, password } = req.body ?? {};
	if (
		typeof name !== "string" ||
		name.trim().length < 2 ||
		name.trim().length > 100 ||
		typeof email !== "string" ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
		typeof password !== "string" ||
		password.length < 8 ||
		password.length > 128
	) {
		return res.status(400).json({ message: "Provide a valid name, email, and password of at least 8 characters" });
	}

	if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
		return res.status(500).json({ message: "Authentication is not configured" });
	}

	const regularRole = await Role.findOne({ code: 2 }).select("_id");
	if (!regularRole) {
		return res.status(500).json({ message: "Regular user role is not configured" });
	}

	const normalizedEmail = email.trim().toLowerCase();
	if (await User.exists({ email: normalizedEmail })) {
		return res.status(409).json({ message: "An account with this email already exists" });
	}

	const user = await User.create({
		name: name.trim(),
		email: normalizedEmail,
		password: await bcrypt.hash(password, 12),
	});
	try {
		await UserRole.create({ userId: user._id, roleId: regularRole._id });
	} catch (error) {
		await User.deleteOne({ _id: user._id });
		throw error;
	}
	const tokenPair = await issueTokenPair(user);
	return res.status(201).json({
		message: "Account created",
		data: { accessToken: tokenPair.accessToken, refreshToken: tokenPair.refreshToken, tokenType: "Bearer" },
		user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
	});
};

const login = async (req, res) => {
	const { email, password } = req.body ?? {};
	if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
		return res.status(400).json({ message: "Email and password are required" });
	}
	const user = await User.findOne({ email: email.trim().toLowerCase() });
	if (!user || !user.isActive || !user.password || !(await bcrypt.compare(password, user.password))) {
		return res.status(401).json({ message: "Invalid email or password" });
	}
	const assignments = await UserRole.find({ userId: user._id }).populate("roleId", "name");
	if (!assignments.some(({ roleId }) => roleId?.name?.toLowerCase() === "user")) {
		return res.status(403).json({ message: "A regular user account is required" });
	}
	const tokenPair = await issueTokenPair(user);
	return res.json({
		message: "Login successful",
		data: { accessToken: tokenPair.accessToken, refreshToken: tokenPair.refreshToken, tokenType: "Bearer" },
		user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
	});
};

const requestPasswordReset = async (req, res) => {
	const { email } = req.body ?? {};
	if (typeof email !== "string" || !email.trim()) {
		return res.status(400).json({ message: "Email is required" });
	}
	const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true }).select("_id email");
	if (user) {
		const token = crypto.randomBytes(32).toString("hex");
		await PasswordResetToken.deleteMany({ user: user._id });
		await PasswordResetToken.create({
			user: user._id,
			tokenHash: hashToken(token),
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		});
		const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
		const resetUrl = `${clientUrl}/reset-password/${token}`;
		await sendMail({
			to: user.email,
			subject: "Reset your blog account password",
			text: `Use this link within 1 hour to reset your password: ${resetUrl}`,
			html: `<p>Use the link below within 1 hour to reset your password.</p><p><a href="${resetUrl}">Reset password</a></p>`,
		});
	}
	return res.json({ message: "If an account exists for that email, a password reset link has been sent." });
};

const resetPassword = async (req, res) => {
	const { token, password } = req.body ?? {};
	if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
		return res.status(400).json({ message: "A valid reset token is required" });
	}
	if (typeof password !== "string" || password.length < 8 || password.length > 128) {
		return res.status(400).json({ message: "Password must be between 8 and 128 characters" });
	}
	const resetRecord = await PasswordResetToken.findOne({
		tokenHash: hashToken(token),
		expiresAt: { $gt: new Date() },
	}).select("+tokenHash");
	if (!resetRecord) {
		return res.status(400).json({ message: "This password reset link is invalid or expired" });
	}
	const user = await User.findOneAndUpdate(
		{ _id: resetRecord.user, isActive: true },
		{ $set: { password: await bcrypt.hash(password, 12) } },
		{ returnDocument: "after", runValidators: true }
	);
	if (!user) {
		await PasswordResetToken.deleteOne({ _id: resetRecord._id });
		return res.status(400).json({ message: "This password reset link is invalid or expired" });
	}
	await Promise.all([
		PasswordResetToken.deleteMany({ user: user._id }),
		RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }),
	]);
	return res.json({ message: "Password updated. Please sign in with your new password." });
};

const getRefreshPayload = (token) => {
	if (!process.env.REFRESH_TOKEN_SECRET) {
		throw new Error("REFRESH_TOKEN_SECRET is not configured");
	}

	try {
		const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
			algorithms: ["HS256"],
		});
		if (
			typeof payload === "string" ||
			payload.tokenType !== "refresh" ||
			typeof payload.sub !== "string" ||
			!mongoose.isValidObjectId(payload.sub) ||
			typeof payload.jti !== "string"
		) {
			return null;
		}
		return payload;
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
			return null;
		}
		throw error;
	}
};

const refresh = async (req, res) => {
	const token = req.body?.refreshToken;
	if (typeof token !== "string" || !token.trim()) {
		return res.status(400).json({ message: "refreshToken is required" });
	}

	const payload = getRefreshPayload(token);
	if (!payload) {
		return res.status(401).json({ message: "Invalid or expired refresh token" });
	}

	const storedToken = await RefreshToken.findOne({
		user: payload.sub,
		tokenHash: hashToken(token),
		expiresAt: { $gt: new Date() },
	});
	if (!storedToken) {
		return res.status(401).json({ message: "Invalid or expired refresh token" });
	}

	if (storedToken.revokedAt) {
		await RefreshToken.updateMany(
			{ user: storedToken.user, revokedAt: null },
			{ $set: { revokedAt: new Date() } }
		);
		return res.status(401).json({ message: "Refresh token reuse detected; sign in again" });
	}

	const user = await User.findById(payload.sub);
	if (!user || !user.isActive) {
		await RefreshToken.updateMany(
			{ user: payload.sub, revokedAt: null },
			{ $set: { revokedAt: new Date() } }
		);
		return res.status(401).json({ message: "User account is unavailable" });
	}

	const now = new Date();
	const revokedToken = await RefreshToken.findOneAndUpdate(
		{ _id: storedToken._id, revokedAt: null, expiresAt: { $gt: now } },
		{ $set: { revokedAt: now } },
		{ returnDocument: "after" }
	);
	if (!revokedToken) {
		const wasAlreadyUsed = await RefreshToken.exists({
			_id: storedToken._id,
			revokedAt: { $ne: null },
		});
		if (wasAlreadyUsed) {
			await RefreshToken.updateMany(
				{ user: storedToken.user, revokedAt: null },
				{ $set: { revokedAt: new Date() } }
			);
		}
		return res.status(401).json({ message: "Refresh token has already been used" });
	}

	const tokenPair = await issueTokenPair(user);
	await RefreshToken.updateOne(
		{ _id: revokedToken._id },
		{ $set: { replacedByToken: tokenPair.refreshTokenId } }
	);

	return res.json({
		data: {
			accessToken: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			tokenType: "Bearer",
		},
	});
};

const logout = async (req, res) => {
	const token = req.body?.refreshToken;
	if (typeof token !== "string" || !token.trim()) {
		return res.status(400).json({ message: "refreshToken is required" });
	}

	const payload = getRefreshPayload(token);
	if (!payload) {
		return res.status(401).json({ message: "Invalid or expired refresh token" });
	}

	await RefreshToken.updateOne(
		{
			user: payload.sub,
			tokenHash: hashToken(token),
			revokedAt: null,
		},
		{ $set: { revokedAt: new Date() } }
	);

	return res.json({ message: "Logged out successfully" });
};

module.exports = { register, login, requestPasswordReset, resetPassword, refresh, logout };
