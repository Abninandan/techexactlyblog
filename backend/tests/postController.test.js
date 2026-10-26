const mongoose = require("mongoose");

jest.mock("../src/Model/Mongodb", () => ({
	Comment: {
		create: jest.fn(),
		findOneAndDelete: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
	Post: {
		countDocuments: jest.fn(),
		create: jest.fn(),
		deleteOne: jest.fn(),
		exists: jest.fn(),
		find: jest.fn(),
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
	PostImage: {
		aggregate: jest.fn(),
		find: jest.fn(),
		insertMany: jest.fn(),
		deleteMany: jest.fn(),
	},
	User: {},
}));

const { Comment, Post, PostImage } = require("../src/Model/Mongodb");
const {
	createComment,
	deleteOwnComment,
	deleteOwnPost,
	listPosts,
	updateOwnComment,
	updateOwnPost,
} = require("../src/Controller/PostController");

const responseMock = () => {
	const res = {};
	res.status = jest.fn(() => res);
	res.json = jest.fn(() => res);
	return res;
};

const queryMock = (value) => {
	const query = {};
	for (const method of ["populate", "sort", "skip", "limit", "select"]) {
		query[method] = jest.fn(() => query);
	}
	query.lean = jest.fn().mockResolvedValue(value);
	return query;
};

beforeEach(() => jest.clearAllMocks());

test("rejects invalid feed pagination before querying posts", async () => {
	const res = responseMock();

	await listPosts({ query: { page: "0" } }, res);

	expect(res.status).toHaveBeenCalledWith(400);
	expect(Post.find).not.toHaveBeenCalled();
});

test("returns a paginated public feed with a summary for posts without images", async () => {
	const post = { _id: new mongoose.Types.ObjectId(), title: "Story", author: { name: "Avery" } };
	Post.find.mockReturnValue(queryMock([post]));
	Post.countDocuments.mockResolvedValue(1);
	PostImage.aggregate.mockResolvedValue([]);
	const res = responseMock();

	await listPosts({ query: { page: "2", limit: "20" } }, res);

	expect(Post.find).toHaveBeenCalledWith({ isActive: true, deletedAt: null });
	expect(Post.find.mock.results[0].value.skip).toHaveBeenCalledWith(20);
	expect(Post.find.mock.results[0].value.limit).toHaveBeenCalledWith(20);
	expect(res.json).toHaveBeenCalledWith({
		data: [{ ...post, imageCount: 0, coverImage: null }],
		pagination: { page: 2, limit: 20, total: 1, pages: 1 },
	});
});

test("creates comments only for valid posts and trims validated content", async () => {
	const postId = new mongoose.Types.ObjectId().toString();
	const comment = { _id: "comment-1", populate: jest.fn().mockResolvedValue(undefined) };
	Post.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: postId }) });
	Comment.create.mockResolvedValue(comment);
	const res = responseMock();

	await createComment({
		params: { postId },
		body: { content: "  A useful comment  " },
		user: { sub: "user-1" },
	}, res);

	expect(Comment.create).toHaveBeenCalledWith({
		post: postId,
		author: "user-1",
		content: "A useful comment",
	});
	expect(comment.populate).toHaveBeenCalledWith("author", "name avatarUrl");
	expect(res.status).toHaveBeenCalledWith(201);
	expect(res.json).toHaveBeenCalledWith({ data: comment });
});

test("rejects malformed comment requests without creating records", async () => {
	const res = responseMock();
	await createComment({ params: { postId: "not-an-object-id" }, body: {}, user: { sub: "user-1" } }, res);
	expect(res.status).toHaveBeenCalledWith(400);
	expect(Post.findOne).not.toHaveBeenCalled();

	const validPostId = new mongoose.Types.ObjectId().toString();
	await createComment({ params: { postId: validPostId }, body: { content: " " }, user: { sub: "user-1" } }, res);
	expect(res.status).toHaveBeenLastCalledWith(400);
	expect(Comment.create).not.toHaveBeenCalled();
});

test("constrains post edits to the current owner and derives a new slug from the title", async () => {
	const postId = new mongoose.Types.ObjectId().toString();
	const updatedPost = { _id: postId, title: "A New Story" };
	Post.exists.mockResolvedValue(false);
	Post.findOneAndUpdate.mockResolvedValue(updatedPost);
	const res = responseMock();

	await updateOwnPost({
		params: { postId },
		body: { title: "A New Story" },
		user: { sub: "user-1" },
	}, res);

	expect(Post.findOneAndUpdate).toHaveBeenCalledWith(
		{ _id: postId, author: "user-1", deletedAt: null },
		{ $set: { title: "A New Story", slug: `a-new-story-${postId.slice(-8)}` } },
		{ returnDocument: "after", runValidators: true }
	);
	expect(res.json).toHaveBeenCalledWith({ data: updatedPost });
});

test("returns not found rather than updating a post owned by a different user", async () => {
	const postId = new mongoose.Types.ObjectId().toString();
	Post.findOneAndUpdate.mockResolvedValue(null);
	const res = responseMock();

	await updateOwnPost({
		params: { postId },
		body: { content: "Attempted edit" },
		user: { sub: "user-2" },
	}, res);

	expect(Post.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ author: "user-2", _id: postId });
	expect(res.status).toHaveBeenCalledWith(404);
});

test("soft-deletes only an active post belonging to the current user", async () => {
	const postId = new mongoose.Types.ObjectId().toString();
	const deletedPost = { _id: postId, deletedAt: new Date(), isActive: false };
	Post.findOneAndUpdate.mockResolvedValue(deletedPost);
	const res = responseMock();

	await deleteOwnPost({ params: { postId }, user: { sub: "user-1" } }, res);

	expect(Post.findOneAndUpdate).toHaveBeenCalledWith(
		{ _id: postId, author: "user-1", deletedAt: null },
		{ $set: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }) },
		{ returnDocument: "after" }
	);
	expect(res.json).toHaveBeenCalledWith({ message: "Post deleted" });
});

test("enforces comment ownership during edits and deletes", async () => {
	const commentId = new mongoose.Types.ObjectId().toString();
	const res = responseMock();
	Comment.findOneAndUpdate.mockReturnValue({
		populate: jest.fn().mockResolvedValue(null),
	});

	await updateOwnComment({
		params: { commentId },
		body: { content: "Updated" },
		user: { sub: "user-2" },
	}, res);

	expect(Comment.findOneAndUpdate).toHaveBeenCalledWith(
		{ _id: commentId, author: "user-2" },
		{ $set: { content: "Updated" } },
		{ returnDocument: "after", runValidators: true }
	);
	expect(res.status).toHaveBeenCalledWith(404);

	Comment.findOneAndDelete.mockResolvedValue(null);
	await deleteOwnComment({ params: { commentId }, user: { sub: "user-2" } }, res);
	expect(Comment.findOneAndDelete).toHaveBeenCalledWith({ _id: commentId, author: "user-2" });
	expect(res.status).toHaveBeenLastCalledWith(404);
});
