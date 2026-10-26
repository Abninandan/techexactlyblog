const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

jest.mock("../src/Model/Mongodb", () => ({
	Comment: { create: jest.fn() },
	PasswordResetToken: {},
	Post: {
		exists: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
	PostImage: { insertMany: jest.fn(), deleteMany: jest.fn() },
	RefreshToken: {
		exists: jest.fn(),
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
		updateMany: jest.fn(),
		updateOne: jest.fn(),
	},
	Role: { findOne: jest.fn() },
	User: {
		create: jest.fn(),
		exists: jest.fn(),
		findById: jest.fn(),
		findOne: jest.fn(),
	},
	UserRole: {
		create: jest.fn(),
		find: jest.fn(),
	},
}));

jest.mock("../src/utils/tokenService", () => ({
	hashToken: jest.fn(),
	issueTokenPair: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
	hash: jest.fn().mockResolvedValue("test-password-hash"),
	compare: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const { Post, RefreshToken, Role, User, UserRole } = require("../src/Model/Mongodb");
const { hashToken, issueTokenPair } = require("../src/utils/tokenService");
const authRoutes = require("../src/Route/authRoutes");
const postRoutes = require("../src/Route/postRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use((error, req, res, next) => {
	if (res.headersSent) return next(error);
	return res.status(500).json({ error: { message: "Internal server error" } });
});

const accessSecret = "test-access-secret";
const userId = new mongoose.Types.ObjectId().toString();

beforeEach(() => {
	jest.clearAllMocks();
	process.env.JWT_SECRET = accessSecret;
	process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
	hashToken.mockReturnValue("refresh-token-hash");
});

test("registers a regular account through the mounted auth route", async () => {
	Role.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-user" }) });
	User.exists.mockResolvedValue(null);
	User.create.mockResolvedValue({
		_id: userId,
		name: "Alex Reader",
		email: "alex@example.test",
		avatarUrl: "",
	});
	UserRole.create.mockResolvedValue({});
	issueTokenPair.mockResolvedValue({ accessToken: "access-token", refreshToken: "refresh-token" });

	const response = await request(app).post("/api/auth/register").send({
		name: "Alex Reader",
		email: "Alex@Example.Test",
		password: "StrongPass123!",
	});

	expect(response.status).toBe(201);
	expect(response.body.user).toMatchObject({ id: userId, email: "alex@example.test" });
	expect(response.body.data).toMatchObject({
		accessToken: "access-token",
		refreshToken: "refresh-token",
	});
	expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
		email: "alex@example.test",
		name: "Alex Reader",
		password: "test-password-hash",
	}));
	expect(bcrypt.hash).toHaveBeenCalledWith("StrongPass123!", 12);
	expect(UserRole.create).toHaveBeenCalledWith({ userId, roleId: "role-user" });
});

test("rejects registration before database writes when JWT secrets are missing", async () => {
	delete process.env.JWT_SECRET;

	const response = await request(app).post("/api/auth/register").send({
		name: "Alex Reader",
		email: "alex@example.test",
		password: "StrongPass123!",
	});

	expect(response.status).toBe(500);
	expect(response.body.message).toBe("Authentication is not configured");
	expect(Role.findOne).not.toHaveBeenCalled();
	expect(User.create).not.toHaveBeenCalled();
});

test("authenticates regular users and returns a token pair", async () => {
	User.findOne.mockResolvedValue({
		_id: userId,
		name: "Alex Reader",
		email: "alex@example.test",
		avatarUrl: "",
		isActive: true,
		password: "stored-password-hash",
	});
	bcrypt.compare.mockResolvedValue(true);
	UserRole.find.mockReturnValue({
		populate: jest.fn().mockResolvedValue([{ roleId: { name: "user" } }]),
	});
	issueTokenPair.mockResolvedValue({ accessToken: "access-token", refreshToken: "refresh-token" });

	const response = await request(app).post("/api/auth/login").send({
		email: "  Alex@Example.Test ",
		password: "StrongPass123!",
	});

	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		accessToken: "access-token",
		refreshToken: "refresh-token",
		tokenType: "Bearer",
	});
	expect(User.findOne).toHaveBeenCalledWith({ email: "alex@example.test" });
	expect(bcrypt.compare).toHaveBeenCalledWith("StrongPass123!", "stored-password-hash");
});

test("rejects invalid login credentials without issuing tokens", async () => {
	User.findOne.mockResolvedValue(null);

	const response = await request(app).post("/api/auth/login").send({
		email: "missing@example.test",
		password: "incorrect",
	});

	expect(response.status).toBe(401);
	expect(issueTokenPair).not.toHaveBeenCalled();
});

test("rotates a valid refresh token and links the replacement token record", async () => {
	const refreshToken = jwt.sign(
		{ sub: userId, tokenType: "refresh" },
		process.env.REFRESH_TOKEN_SECRET,
		{ jwtid: "refresh-jti", expiresIn: "1h" }
	);
	const storedToken = { _id: "refresh-record-old", user: userId, revokedAt: null };
	const user = { _id: userId, isActive: true };
	RefreshToken.findOne.mockResolvedValue(storedToken);
	RefreshToken.findOneAndUpdate.mockResolvedValue(storedToken);
	User.findById.mockResolvedValue(user);
	issueTokenPair.mockResolvedValue({
		accessToken: "access-new",
		refreshToken: "refresh-new",
		refreshTokenId: "refresh-record-new",
	});

	const response = await request(app)
		.post("/api/auth/refresh")
		.send({ refreshToken });

	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		accessToken: "access-new",
		refreshToken: "refresh-new",
	});
	expect(RefreshToken.findOneAndUpdate).toHaveBeenCalledWith(
		expect.objectContaining({ _id: storedToken._id, revokedAt: null }),
		expect.objectContaining({ $set: { revokedAt: expect.any(Date) } }),
		{ returnDocument: "after" }
	);
	expect(RefreshToken.updateOne).toHaveBeenCalledWith(
		{ _id: storedToken._id },
		{ $set: { replacedByToken: "refresh-record-new" } }
	);
});

test("revokes the remaining refresh-token family after reuse is detected", async () => {
	const refreshToken = jwt.sign(
		{ sub: userId, tokenType: "refresh" },
		process.env.REFRESH_TOKEN_SECRET,
		{ jwtid: "reused-jti", expiresIn: "1h" }
	);
	RefreshToken.findOne.mockResolvedValue({
		_id: "refresh-record-reused",
		user: userId,
		revokedAt: new Date(),
	});

	const response = await request(app)
		.post("/api/auth/refresh")
		.send({ refreshToken });

	expect(response.status).toBe(401);
	expect(response.body.message).toMatch(/reuse detected/i);
	expect(RefreshToken.updateMany).toHaveBeenCalledWith(
		{ user: userId, revokedAt: null },
		{ $set: { revokedAt: expect.any(Date) } }
	);
	expect(issueTokenPair).not.toHaveBeenCalled();
});

test("revokes a valid refresh token on logout", async () => {
	const refreshToken = jwt.sign(
		{ sub: userId, tokenType: "refresh" },
		process.env.REFRESH_TOKEN_SECRET,
		{ jwtid: "logout-jti", expiresIn: "1h" }
	);

	const response = await request(app)
		.post("/api/auth/logout")
		.send({ refreshToken });

	expect(response.status).toBe(200);
	expect(RefreshToken.updateOne).toHaveBeenCalledWith(
		{ user: userId, tokenHash: "refresh-token-hash", revokedAt: null },
		{ $set: { revokedAt: expect.any(Date) } }
	);
});

test("requires authentication before regular-user post updates", async () => {
	const response = await request(app)
		.patch(`/api/posts/${new mongoose.Types.ObjectId()}`)
		.send({ content: "Updated content" });

	expect(response.status).toBe(401);
	expect(response.body.message).toBe("Authentication required");
	expect(UserRole.find).not.toHaveBeenCalled();
});

test("constrains post updates to the authenticated author's own record", async () => {
	const postId = new mongoose.Types.ObjectId().toString();
	const token = jwt.sign({ sub: userId, tokenType: "access" }, accessSecret);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue({
		populate: jest.fn().mockResolvedValue([{ roleId: { name: "user" } }]),
	});
	Post.exists.mockResolvedValue(false);
	Post.findOneAndUpdate.mockResolvedValue(null);

	const response = await request(app)
		.patch(`/api/posts/${postId}`)
		.set("Authorization", `Bearer ${token}`)
		.send({ content: "Updated content" });

	expect(response.status).toBe(404);
	expect(response.body.message).toBe("Post not found");
	expect(Post.findOneAndUpdate).toHaveBeenCalledWith(
		{ _id: postId, author: userId, deletedAt: null },
		{ $set: { content: "Updated content" } },
		{ returnDocument: "after", runValidators: true }
	);
});
