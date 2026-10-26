const mongoose = require("mongoose");

const postRatingSchema = new mongoose.Schema(
	{
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		value: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
			validate: Number.isInteger,
		},
	},
	{
		collection: "post_ratings",
		timestamps: true,
	}
);

postRatingSchema.index({ post: 1, user: 1 }, { unique: true });
postRatingSchema.index({ post: 1, value: 1 });

module.exports = mongoose.model("PostRating", postRatingSchema);
