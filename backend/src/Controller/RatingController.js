const mongoose = require("mongoose");
const { Post, PostRating } = require("../Model/Mongodb");

const setPostRating = async (req, res) => {
	if (!mongoose.isValidObjectId(req.params.postId)) {
		return res.status(400).json({ message: "Invalid post ID" });
	}

	const value = req.body?.value;
	if (!Number.isInteger(value) || value < 1 || value > 5) {
		return res.status(400).json({ message: "value must be an integer between 1 and 5" });
	}

	const post = await Post.findOne({
		_id: req.params.postId,
		deletedAt: null,
		isActive: true,
	}).select("_id");
	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	const rating = await PostRating.findOneAndUpdate(
		{ post: post._id, user: req.user.sub },
		{ $set: { value } },
		{ returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
	);
	const [summary] = await PostRating.aggregate([
		{ $match: { post: post._id } },
		{
			$group: {
				_id: "$post",
				averageRating: { $avg: "$value" },
				ratingCount: { $sum: 1 },
			},
		},
	]);

	const updatedPost = await Post.findByIdAndUpdate(
		post._id,
		{
			$set: {
				averageRating: summary.averageRating,
				ratingCount: summary.ratingCount,
			},
		},
		{ returnDocument: "after", runValidators: true }
	).select("title slug averageRating ratingCount");

	return res.json({ data: { rating, post: updatedPost } });
};

module.exports = { setPostRating };
