const fs = require("node:fs/promises");
const mongoose = require("mongoose");
const { z } = require("zod");
const { Comment, Post, PostImage, User } = require("../Model/Mongodb");
const upload = require("../utils/upload");

const postSchema = z.object({
	title: z.string().trim().min(1).max(200),
	content: z.string().trim().min(1).max(100000),
});
const postUpdateSchema = postSchema.partial().refine((updates) => Object.keys(updates).length > 0, {
	message: "Provide a title or content to update",
});
const commentSchema = z.object({ content: z.string().trim().min(1).max(5000) });
const validationMessage = (result) => result.error.issues[0]?.message || "Invalid request payload";

const parsePagination = (query) => {
	const page = query.page === undefined ? 1 : Number(query.page);
	const limit = query.limit === undefined ? 10 : Number(query.limit);
	if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
		return null;
	}
	return { page, limit, skip: (page - 1) * limit };
};

const addImageSummaries = async (posts) => {
	if (!posts.length) return posts;
	const summaries = await PostImage.aggregate([
		{ $match: { post: { $in: posts.map(({ _id }) => _id) } } },
		{ $sort: { createdAt: 1, _id: 1 } },
		{
			$group: {
				_id: "$post",
				imageCount: { $sum: 1 },
				coverImage: { $first: "$$ROOT" },
			},
		},
	]);
	const byPost = new Map(summaries.map((summary) => [summary._id.toString(), summary]));
	return posts.map((post) => {
		const summary = byPost.get(post._id.toString());
		return { ...post, imageCount: summary?.imageCount ?? 0, coverImage: summary?.coverImage ?? null };
	});
};

const listPosts = async (req, res) => {
	const pagination = parsePagination(req.query);
	if (!pagination) {
		return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" });
	}
	const filter = { isActive: true, deletedAt: null };
	const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
	if (search) {
		const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		filter.title = { $regex: safeSearch, $options: "i" };
	}
	const [posts, total] = await Promise.all([
		Post.find(filter)
			.populate("author", "name avatarUrl")
			.sort({ createdAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Post.countDocuments(filter),
	]);
	return res.json({
		data: await addImageSummaries(posts),
		pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
	});
};

const getPost = async (req, res) => {
	const post = await Post.findOne({ slug: req.params.slug, isActive: true, deletedAt: null })
		.populate("author", "name avatarUrl createdAt")
		.lean();
	if (!post) return res.status(404).json({ message: "Post not found" });

	const [images, comments, relatedPosts] = await Promise.all([
		PostImage.find({ post: post._id }).sort({ createdAt: 1, _id: 1 }).lean(),
		Comment.find({ post: post._id, isActive: true })
			.populate("author", "name avatarUrl")
			.sort({ createdAt: -1 })
			.limit(100)
			.lean(),
		Post.find({
			_id: { $ne: post._id },
			author: post.author._id,
			isActive: true,
			deletedAt: null,
		})
			.populate("author", "name avatarUrl")
			.sort({ createdAt: -1 })
			.limit(4)
			.lean(),
	]);
	const related = relatedPosts.length
		? relatedPosts
		: await Post.find({ _id: { $ne: post._id }, isActive: true, deletedAt: null })
				.populate("author", "name avatarUrl")
				.sort({ createdAt: -1 })
				.limit(4)
				.lean();

	return res.json({
		data: {
			...post,
			images,
			comments,
			relatedPosts: await addImageSummaries(related),
		},
	});
};

const listAuthors = async (req, res) => {
	const authors = await Post.aggregate([
		{ $match: { isActive: true, deletedAt: null } },
		{ $group: { _id: "$author", postCount: { $sum: 1 }, latestPostAt: { $max: "$createdAt" } } },
		{ $sort: { postCount: -1, latestPostAt: -1 } },
		{ $limit: 20 },
		{
			$lookup: {
				from: "users",
				localField: "_id",
				foreignField: "_id",
				as: "author",
			},
		},
		{ $unwind: "$author" },
		{
			$project: {
				_id: "$author._id",
				name: "$author.name",
				avatarUrl: "$author.avatarUrl",
				postCount: 1,
			},
		},
	]);
	return res.json({ data: authors });
};

const getAuthorPosts = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.authorId)) {
		return res.status(400).json({ message: "Invalid author ID" });
	}
	const pagination = parsePagination(req.query);
	if (!pagination) {
		return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" });
	}
	const author = await User.findById(req.params.authorId).select("name avatarUrl createdAt").lean();
	if (!author) return res.status(404).json({ message: "Author not found" });

	const filter = { author: author._id, isActive: true, deletedAt: null };
	const [posts, total] = await Promise.all([
		Post.find(filter)
			.populate("author", "name avatarUrl")
			.sort({ createdAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Post.countDocuments(filter),
	]);
	return res.json({
		data: { author, posts: await addImageSummaries(posts) },
		pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
	});
};

const removeUploadedFiles = async (files) => {
	const results = await Promise.allSettled(files.map(({ path: filePath }) => fs.unlink(filePath)));
	results.forEach((result) => {
		if (result.status === "rejected" && result.reason.code !== "ENOENT") {
			console.error("Could not clean up an uploaded post image:", result.reason);
		}
	});
};

const createPost = async (req, res) => {
	const parsed = postSchema.safeParse(req.body);
	if (!parsed.success) {
		await removeUploadedFiles(req.files || []);
		return res.status(400).json({ message: validationMessage(parsed) });
	}
	const { title, content } = parsed.data;
	const slugBase = title.trim().toLowerCase().normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
	const postId = new mongoose.Types.ObjectId();
	let slug = `${slugBase}-${postId.toString().slice(-8)}`;
	if (await Post.exists({ slug })) slug = `${slugBase}-${postId.toString()}`;

	try {
		const post = await Post.create({
			_id: postId,
			title: title.trim(),
			content: content.trim(),
			slug,
			author: req.user.sub,
		});
		const images = req.files?.length
			? await PostImage.insertMany(req.files.map((file) => ({
					post: post._id,
					url: `/uploads/${file.filename}`,
					originalName: file.originalname,
					mimeType: file.mimetype,
					size: file.size,
			  })))
			: [];
		return res.status(201).json({ data: { ...post.toObject(), images } });
	} catch (error) {
		await PostImage.deleteMany({ post: postId });
		await Post.deleteOne({ _id: postId });
		await removeUploadedFiles(req.files || []);
		throw error;
	}
};

const createComment = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}
	const parsed = commentSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ message: validationMessage(parsed) });
	const post = await Post.findOne({ _id: req.params.postId, isActive: true, deletedAt: null }).select("_id");
	if (!post) return res.status(404).json({ message: "Post not found" });
	const comment = await Comment.create({ post: post._id, author: req.user.sub, content: parsed.data.content });
	await comment.populate("author", "name avatarUrl");
	return res.status(201).json({ data: comment });
};

const updateOwnComment = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.commentId)) {
		return res.status(400).json({ message: "Invalid comment ID" });
	}
	const parsed = commentSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ message: validationMessage(parsed) });
	const comment = await Comment.findOneAndUpdate(
		{ _id: req.params.commentId, author: req.user.sub },
		{ $set: { content: parsed.data.content } },
		{ returnDocument: "after", runValidators: true }
	).populate("author", "name avatarUrl");
	if (!comment) return res.status(404).json({ message: "Comment not found" });
	return res.json({ data: comment });
};

const deleteOwnComment = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.commentId)) {
		return res.status(400).json({ message: "Invalid comment ID" });
	}
	const comment = await Comment.findOneAndDelete({ _id: req.params.commentId, author: req.user.sub });
	if (!comment) return res.status(404).json({ message: "Comment not found" });
	return res.json({ message: "Comment deleted" });
};

const updateOwnPost = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}
	const parsed = postUpdateSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ message: validationMessage(parsed) });
	const updates = parsed.data;
	if (updates.title) {
		const slugBase = updates.title.toLowerCase().normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
		updates.slug = `${slugBase}-${req.params.postId.slice(-8)}`;
		if (await Post.exists({ slug: updates.slug, _id: { $ne: req.params.postId } })) {
			updates.slug = `${slugBase}-${req.params.postId}`;
		}
	}
	const post = await Post.findOneAndUpdate(
		{ _id: req.params.postId, author: req.user.sub, deletedAt: null },
		{ $set: updates },
		{ returnDocument: "after", runValidators: true }
	);
	if (!post) return res.status(404).json({ message: "Post not found" });
	return res.json({ data: post });
};

const deleteOwnPost = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}
	const post = await Post.findOneAndUpdate(
		{ _id: req.params.postId, author: req.user.sub, deletedAt: null },
		{ $set: { deletedAt: new Date(), isActive: false } },
		{ returnDocument: "after" }
	);
	if (!post) return res.status(404).json({ message: "Post not found" });
	return res.json({ message: "Post deleted" });
};

const createPostWithImages = (req, res, next) => {
	upload.array("images", 10)(req, res, (error) => {
		if (error) return next(error);
		return createPost(req, res).catch(next);
	});
};

module.exports = {
	listPosts,
	getPost,
	listAuthors,
	getAuthorPosts,
	createPostWithImages,
	updateOwnPost,
	deleteOwnPost,
	createComment,
	updateOwnComment,
	deleteOwnComment,
};
