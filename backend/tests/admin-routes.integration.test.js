const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

jest.mock("../src/Model/Mongodb", () => ({
	Comment: {
		countDocuments: jest.fn(),
		findByIdAndDelete: jest.fn(),
		findByIdAndUpdate: jest.fn(),
		find: jest.fn(),
	},
	Post: {
		countDocuments: jest.fn(),
		exists: jest.fn(),
		find: jest.fn(),
	},
	PostImage: { aggregate: jest.fn() },
	Role: { findOne: jest.fn() },
	SiteBranding: {},
	User: {
		countDocuments: jest.fn(),
		find: jest.fn(),
		findById: jest.fn(),
		findByIdAndUpdate: jest.fn(),
	},
	UserRole: { find: jest.fn(), findOne: jest.fn() },
}));

const { Comment, Post, PostImage, Role, User, UserRole } = require("../src/Model/Mongodb");
const adminRoutes = require("../src/Route/adminRoutes");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use((error, req, res, next) => {
	if (res.headersSent) return next(error);
	return res.status(500).json({ error: { message: "Internal server error" } });
});

const accessSecret = "admin-test-access-secret";
const adminId = new mongoose.Types.ObjectId().toString();
const commentId = new mongoose.Types.ObjectId().toString();

const roleLookup = (roleName) => ({
	populate: jest.fn().mockResolvedValue([{ roleId: { name: roleName } }]),
});

const queryMock = (value) => {
	const query = {
		limit: jest.fn(() => query),
		populate: jest.fn(() => query),
		select: jest.fn(() => query),
		skip: jest.fn(() => query),
		sort: jest.fn(() => query),
		then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
	};
	query.lean = jest.fn().mockResolvedValue(value);
	return query;
};

const commentQuery = (comment) => {
	const query = {
		populate: jest.fn(() => query),
		then: (resolve, reject) => Promise.resolve(comment).then(resolve, reject),
	};
	return query;
};

beforeEach(() => {
	jest.clearAllMocks();
	process.env.JWT_SECRET = accessSecret;
});

test("requires authentication on the admin dashboard route", async () => {
	const response = await request(app).get("/api/admin/dashboard");

	expect(response.status).toBe(401);
	expect(User.countDocuments).not.toHaveBeenCalled();
});

test("rejects regular-user tokens from administrator comment-management routes", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("user"));

	const response = await request(app)
		.patch(`/api/admin/comments/${commentId}`)
		.set("Authorization", `Bearer ${token}`)
		.send({ content: "Unauthorized change" });

	expect(response.status).toBe(403);
	expect(response.body.message).toBe("Administrator access required");
	expect(Comment.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("allows administrators to edit comments with validated content", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	const updatedComment = { _id: commentId, content: "Updated by admin" };
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("admin"));
	Comment.findByIdAndUpdate.mockReturnValue(commentQuery(updatedComment));

	const response = await request(app)
		.patch(`/api/admin/comments/${commentId}`)
		.set("Authorization", `Bearer ${token}`)
		.send({ content: "  Updated by admin  " });

	expect(response.status).toBe(200);
	expect(Comment.findByIdAndUpdate).toHaveBeenCalledWith(
		commentId,
		{ $set: { content: "Updated by admin" } },
		{ returnDocument: "after", runValidators: true }
	);
	expect(response.body.data.content).toBe("Updated by admin");
});

test("allows administrators to delete comments", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("admin"));
	Comment.findByIdAndDelete.mockResolvedValue({ _id: commentId });

	const response = await request(app)
		.delete(`/api/admin/comments/${commentId}`)
		.set("Authorization", `Bearer ${token}`);

	expect(response.status).toBe(200);
	expect(Comment.findByIdAndDelete).toHaveBeenCalledWith(commentId);
	expect(response.body.message).toBe("Comment deleted");
});

test("lists comments with server-side pagination and status filtering", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	const listedComment = { _id: commentId, content: "Review this" };
	const query = queryMock([listedComment]);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("admin"));
	Comment.find.mockReturnValue(query);
	Comment.countDocuments.mockResolvedValue(1);

	const response = await request(app)
		.get("/api/admin/comments?page=2&limit=20&status=inactive")
		.set("Authorization", `Bearer ${token}`);

	expect(response.status).toBe(200);
	expect(Comment.find).toHaveBeenCalledWith({ isActive: false });
	expect(query.skip).toHaveBeenCalledWith(20);
	expect(query.limit).toHaveBeenCalledWith(20);
	expect(response.body.pagination).toEqual({ page: 2, limit: 20, total: 1, pages: 1 });
});

test("lets administrators change comment status and rejects invalid status payloads", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	const updatedComment = { _id: commentId, isActive: false };
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("admin"));
	Comment.findByIdAndUpdate.mockReturnValue(commentQuery(updatedComment));

	const response = await request(app)
		.patch(`/api/admin/comments/${commentId}/status`)
		.set("Authorization", `Bearer ${token}`)
		.send({ isActive: false });

	expect(response.status).toBe(200);
	expect(Comment.findByIdAndUpdate).toHaveBeenCalledWith(
		commentId,
		{ $set: { isActive: false } },
		{ returnDocument: "after", runValidators: true }
	);

	const invalidResponse = await request(app)
		.patch(`/api/admin/comments/${commentId}/status`)
		.set("Authorization", `Bearer ${token}`)
		.send({ isActive: "false" });
	expect(invalidResponse.status).toBe(400);
});

test("returns database totals to an authenticated administrator", async () => {
	const token = jwt.sign({ sub: adminId, email: "admin@example.test", tokenType: "access" }, accessSecret);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValue(roleLookup("admin"));
	User.countDocuments.mockResolvedValue(3);
	Post.countDocuments.mockResolvedValue(4);
	Comment.countDocuments.mockResolvedValue(5);

	const response = await request(app)
		.get("/api/admin/dashboard")
		.set("Authorization", `Bearer ${token}`);

	expect(response.status).toBe(200);
	expect(response.body.data.totals).toEqual({ users: 3, posts: 4, comments: 5 });
	expect(Post.countDocuments).toHaveBeenCalledWith({ deletedAt: null });
});

test("lists regular users with escaped search, status, and backend pagination", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	const userRows = [{ _id: "user-1", name: "Avery Reader", isActive: true }];
	const rolesQuery = queryMock([{ userId: "user-1" }]);
	const usersQuery = queryMock(userRows);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValueOnce(roleLookup("admin")).mockReturnValueOnce(rolesQuery);
	Role.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "regular-role" }) });
	User.find.mockReturnValue(usersQuery);
	User.countDocuments.mockResolvedValue(1);

	const response = await request(app)
		.get("/api/admin/users?page=2&limit=20&search=Avery.&status=active")
		.set("Authorization", `Bearer ${token}`);

	expect(response.status).toBe(200);
	expect(User.find).toHaveBeenCalledWith({
		_id: { $in: ["user-1"] },
		name: { $regex: "Avery\\.", $options: "i" },
		isActive: true,
	});
	expect(usersQuery.skip).toHaveBeenCalledWith(20);
	expect(usersQuery.limit).toHaveBeenCalledWith(20);
	expect(response.body.data).toEqual(userRows);
});

test("filters administrator post results by author, title, status, rating, and pagination", async () => {
	const token = jwt.sign({ sub: adminId, tokenType: "access" }, accessSecret);
	const authorQuery = queryMock([{ _id: "author-1" }]);
	const posts = [{ _id: "post-1", title: "Story", averageRating: 4 }];
	const postsQuery = queryMock(posts);
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true }) });
	UserRole.find.mockReturnValueOnce(roleLookup("admin")).mockReturnValueOnce(roleLookup("admin"));
	User.find.mockReturnValue(authorQuery);
	Post.find.mockReturnValue(postsQuery);
	Post.countDocuments.mockResolvedValue(1);
	PostImage.aggregate.mockResolvedValue([]);

	const response = await request(app)
		.get("/api/admin/posts?page=2&limit=20&title=Story&userName=Avery&status=active&minRating=3&maxRating=5")
		.set("Authorization", `Bearer ${token}`);

	expect(response.status).toBe(200);
	expect(Post.find).toHaveBeenCalledWith({
		deletedAt: null,
		title: { $regex: "Story", $options: "i" },
		isActive: true,
		averageRating: { $gte: 3, $lte: 5 },
		author: { $in: ["author-1"] },
	});
	expect(postsQuery.skip).toHaveBeenCalledWith(20);
	expect(postsQuery.limit).toHaveBeenCalledWith(20);
	expect(response.body.data[0]).toMatchObject({ imageCount: 0, coverImage: null });
});
