const bcrypt = require("bcryptjs");
const fs = require("node:fs/promises");
const mongoose = require("mongoose");
const { z } = require("zod");
const { Comment, Post, PostImage, Role, User, UserRole } = require("../Model/Mongodb");
const { issueTokenPair } = require("../utils/tokenService");

const login = async (req, res) => {
	const { email, password } = req.body ?? {};
	if (
		typeof email !== "string" ||
		typeof password !== "string" ||
		!email.trim() ||
		!password
	) {
		return res.status(400).json({ message: "Email and password are required" });
	}

	if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
		return res.status(500).json({ message: "Authentication is not configured" });
	}

	const user = await User.findOne({ email: email.trim().toLowerCase() });
	if (
		!user ||
		!user.isActive ||
		!user.password ||
		!(await bcrypt.compare(password, user.password))
	) {
		return res.status(401).json({ message: "Invalid email or password" });
	}

	const assignments = await UserRole.find({ userId: user._id }).populate("roleId", "name");
	const isAdmin = assignments.some(
		({ roleId }) => roleId?.name?.toLowerCase() === "admin"
	);
	if (!isAdmin) {
		return res.status(403).json({ message: "Administrator access required" });
	}

	const tokenPair = await issueTokenPair(user);

	return res.json({
		message: "Login successful",
		data: {
			accessToken: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			tokenType: "Bearer",
		},
		user: { id: user._id, name: user.name, email: user.email },
	});
};

const getDashboard = async (req, res) => {
	const [users, posts, comments] = await Promise.all([
		User.countDocuments(),
		Post.countDocuments({ deletedAt: null }),
		Comment.countDocuments(),
	]);

	return res.json({
		data: {
			totals: { users, posts, comments },
			admin: { id: req.user.sub, email: req.user.email },
		},
	});
};

const parsePagination = (query) => {
	const page = query.page === undefined ? 1 : Number(query.page);
	const limit = query.limit === undefined ? 10 : Number(query.limit);

	if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
		return null;
	}

	return { page, limit, skip: (page - 1) * limit };
};

const listRegularUsers = async (req, res) => {
	const pagination = parsePagination(req.query);
	if (!pagination) {
		return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" });
	}

	const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
	const regularRole = await Role.findOne({ code: 2 }).select("_id");
	if (!regularRole) {
		return res.status(500).json({ message: "Regular user role is not configured" });
	}
	const userRoles = await UserRole.find({ roleId: regularRole._id })
		.select("userId")
		.lean();
	const userIds = userRoles.map(({ userId }) => userId);
	const filter = { _id: { $in: userIds } };
	if (search) {
		filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
	}
	if (req.query.status !== undefined) {
		if (req.query.status !== "active" && req.query.status !== "inactive") {
			return res.status(400).json({ message: "status must be active or inactive" });
		}
		filter.isActive = req.query.status === "active";
	}

	const [users, total] = await Promise.all([
		User.find(filter)
			.select("name email avatarUrl isActive createdAt updatedAt")
			.sort({ createdAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		User.countDocuments(filter),
	]);

	return res.json({
		data: users,
		pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
	});
};

const updateUserStatus = async (req, res) => {
	if (typeof req.body?.isActive !== "boolean") {
		return res.status(400).json({ message: "isActive must be a boolean" });
	}

	if (!mongoose.isValidObjectId(req.params.userId)) {
		return res.status(400).json({ message: "Invalid user ID" });
	}

	const regularRole = await Role.findOne({ code: 2 }).select("_id");
	if (!regularRole) {
		return res.status(500).json({ message: "Regular user role is not configured" });
	}

	const assignment = await UserRole.findOne({
		userId: req.params.userId,
		roleId: regularRole._id,
	});
	if (!assignment) {
		return res.status(404).json({ message: "Regular user not found" });
	}

	const user = await User.findByIdAndUpdate(
		req.params.userId,
		{ $set: { isActive: req.body.isActive } },
		{ returnDocument: "after", runValidators: true }
	).select("name email isActive updatedAt");

	return res.json({ data: user });
};

const listPosts = async (req, res) => {
	const pagination = parsePagination(req.query);
	if (!pagination) {
		return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" });
	}

	const filter = { deletedAt: null };
	const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
	const userName = typeof req.query.userName === "string" ? req.query.userName.trim() : "";
	const status = req.query.status;
	const minRating = req.query.minRating === undefined ? undefined : Number(req.query.minRating);
	const maxRating = req.query.maxRating === undefined ? undefined : Number(req.query.maxRating);

	if (title) {
		filter.title = { $regex: title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
	}
	if (status !== undefined) {
		if (status !== "active" && status !== "inactive") {
			return res.status(400).json({ message: "status must be active or inactive" });
		}
		filter.isActive = status === "active";
	}
	if (
		(minRating !== undefined && (!Number.isFinite(minRating) || minRating < 0 || minRating > 5)) ||
		(maxRating !== undefined && (!Number.isFinite(maxRating) || maxRating < 0 || maxRating > 5)) ||
		(minRating !== undefined && maxRating !== undefined && minRating > maxRating)
	) {
		return res.status(400).json({ message: "Rating filters must be between 0 and 5, with minRating no greater than maxRating" });
	}
	if (minRating !== undefined || maxRating !== undefined) {
		filter.averageRating = {};
		if (minRating !== undefined) filter.averageRating.$gte = minRating;
		if (maxRating !== undefined) filter.averageRating.$lte = maxRating;
	}

	if (userName) {
		const safeName = userName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const matchingUsers = await User.find({ name: { $regex: safeName, $options: "i" } })
			.select("_id")
			.lean();
		filter.author = { $in: matchingUsers.map(({ _id }) => _id) };
	}

	const [posts, total] = await Promise.all([
		Post.find(filter)
			.populate("author", "name email")
			.sort({ createdAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Post.countDocuments(filter),
	]);
	const imageSummaries = posts.length
		? await PostImage.aggregate([
				{ $match: { post: { $in: posts.map(({ _id }) => _id) } } },
				{ $sort: { createdAt: 1, _id: 1 } },
				{
					$group: {
						_id: "$post",
						imageCount: { $sum: 1 },
						coverImage: { $first: "$$ROOT" },
					},
				},
		  ])
		: [];
	const summariesByPost = new Map(
		imageSummaries.map((summary) => [summary._id.toString(), summary])
	);
	const postsWithImages = posts.map((post) => {
		const summary = summariesByPost.get(post._id.toString());
		return {
			...post,
			imageCount: summary?.imageCount ?? 0,
			coverImage: summary?.coverImage ?? null,
		};
	});

	return res.json({
		data: postsWithImages,
		pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
	});
};

const getPostImages = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}

	const post = await Post.exists({ _id: req.params.postId, deletedAt: null });
	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	const images = await PostImage.find({ post: req.params.postId })
		.sort({ createdAt: 1, _id: 1 })
		.lean();
	return res.json({ data: images });
};

const removeUploadedFiles = async (files) => {
	const cleanupResults = await Promise.allSettled(files.map(({ path: filePath }) => fs.unlink(filePath)));
	cleanupResults.forEach((result) => {
		if (result.status === "rejected" && result.reason.code !== "ENOENT") {
			console.error("Could not clean up an uploaded post image:", result.reason);
		}
	});
};

const uploadPostImages = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		await removeUploadedFiles(req.files || []);
		return res.status(400).json({ message: "Invalid post ID" });
	}
	if (!req.files?.length) {
		return res.status(400).json({ message: "Select at least one image to upload" });
	}

	try {
		const post = await Post.exists({ _id: req.params.postId, deletedAt: null });
		if (!post) {
			await removeUploadedFiles(req.files);
			return res.status(404).json({ message: "Post not found" });
		}

		const images = await PostImage.insertMany(
			req.files.map((file) => ({
				post: req.params.postId,
				url: `/uploads/${file.filename}`,
				originalName: file.originalname,
				mimeType: file.mimetype,
				size: file.size,
			}))
		);
		return res.status(201).json({ message: "Post images uploaded", data: images });
	} catch (error) {
		await removeUploadedFiles(req.files);
		throw error;
	}
};

const updatePostStatus = async (req, res) => {
	if (typeof req.body?.isActive !== "boolean") {
		return res.status(400).json({ message: "isActive must be a boolean" });
	}
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}

	const post = await Post.findOneAndUpdate(
		{ _id: req.params.postId, deletedAt: null },
		{ $set: { isActive: req.body.isActive } },
		{ returnDocument: "after", runValidators: true }
	).populate("author", "name email");

	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	return res.json({ data: post });
};

const updatePost = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}

	const updates = {};
	if (req.body?.title !== undefined) {
		if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.trim().length > 200) {
			return res.status(400).json({ message: "title must be a non-empty string of at most 200 characters" });
		}
		updates.title = req.body.title.trim();
		updates.slug = updates.title
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		if (!updates.slug) {
			updates.slug = `post-${req.params.postId.toString().slice(-8)}`;
		}
	}
	if (req.body?.content !== undefined) {
		if (typeof req.body.content !== "string" || !req.body.content.trim()) {
			return res.status(400).json({ message: "content must be a non-empty string" });
		}
		updates.content = req.body.content.trim();
	}
	if (!Object.keys(updates).length) {
		return res.status(400).json({ message: "Provide a title or content to update" });
	}
	if (updates.slug !== undefined) {
		const slugConflict = await Post.exists({
			slug: updates.slug,
			_id: { $ne: req.params.postId },
		});
		if (slugConflict) {
			updates.slug = `${updates.slug}-${req.params.postId.toString()}`;
		}
	}

	const post = await Post.findOneAndUpdate(
		{ _id: req.params.postId, deletedAt: null },
		{ $set: updates },
		{ returnDocument: "after", runValidators: true }
	).populate("author", "name email");
	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}
	return res.json({ data: post });
};

const softDeletePost = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}

	const post = await Post.findOneAndUpdate(
		{ _id: req.params.postId, deletedAt: null },
		{ $set: { deletedAt: new Date(), isActive: false } },
		{ returnDocument: "after", runValidators: true }
	);
	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	return res.json({ message: "Post soft-deleted", data: post });
};

const listComments = async (req, res) => {
	const pagination = parsePagination(req.query);
	if (!pagination) {
		return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" });
	}

	const filter = {};
	if (req.query.status !== undefined) {
		if (req.query.status !== "active" && req.query.status !== "inactive") {
			return res.status(400).json({ message: "status must be active or inactive" });
		}
		filter.isActive = req.query.status === "active";
	}
	if (req.query.postId !== undefined) {
		if (!mongoose.isValidObjectId(req.query.postId)) {
			return res.status(400).json({ message: "Invalid post ID" });
		}
		filter.post = req.query.postId;
	}

	const [comments, total] = await Promise.all([
		Comment.find(filter)
			.populate("author", "name email")
			.populate("post", "title slug")
			.sort({ createdAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Comment.countDocuments(filter),
	]);

	return res.json({
		data: comments,
		pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
	});
};

const updateCommentStatus = async (req, res) => {
	if (typeof req.body?.isActive !== "boolean") {
		return res.status(400).json({ message: "isActive must be a boolean" });
	}
	if (!mongoose.isValidObjectId(req.params.commentId)) {
		return res.status(400).json({ message: "Invalid comment ID" });
	}

	const comment = await Comment.findByIdAndUpdate(
		req.params.commentId,
		{ $set: { isActive: req.body.isActive } },
		{ returnDocument: "after", runValidators: true }
	)
		.populate("author", "name email")
		.populate("post", "title slug");

	if (!comment) {
		return res.status(404).json({ message: "Comment not found" });
	}
	return res.json({ data: comment });
};

const updateComment = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.commentId)) {
		return res.status(400).json({ message: "Invalid comment ID" });
	}
	const parsed = z.object({ content: z.string().trim().min(1).max(5000) }).safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid comment content" });
	}
	const comment = await Comment.findByIdAndUpdate(
		req.params.commentId,
		{ $set: { content: parsed.data.content } },
		{ returnDocument: "after", runValidators: true }
	)
		.populate("author", "name email")
		.populate("post", "title slug");
	if (!comment) return res.status(404).json({ message: "Comment not found" });
	return res.json({ data: comment });
};

const deleteComment = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.commentId)) {
		return res.status(400).json({ message: "Invalid comment ID" });
	}
	const comment = await Comment.findByIdAndDelete(req.params.commentId);
	if (!comment) return res.status(404).json({ message: "Comment not found" });
	return res.json({ message: "Comment deleted" });
};

module.exports = {
	login,
	dashboard: getDashboard,
	listRegularUsers,
	updateUserStatus,
	listPosts,
	getPostImages,
	uploadPostImages,
	updatePostStatus,
	updatePost,
	softDeletePost,
	listComments,
	updateCommentStatus,
	updateComment,
	deleteComment,
};