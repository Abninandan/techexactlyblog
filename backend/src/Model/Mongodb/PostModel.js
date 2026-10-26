const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
			minlength: 1,
			maxlength: 200,
		},
		content: {
			type: String,
			required: true,
			trim: true,
			minlength: 1,
		},
		slug: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		averageRating: {
			type: Number,
			default: 0,
			min: 0,
			max: 5,
		},
		ratingCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		collection: "posts",
		timestamps: true,
	}
);

postSchema.virtual("images", {
	ref: "PostImage",
	localField: "_id",
	foreignField: "post",
});

postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ deletedAt: 1, isActive: 1, createdAt: -1 });
postSchema.index({ author: 1, deletedAt: 1, createdAt: -1 });
postSchema.index({ averageRating: -1, ratingCount: -1 });

module.exports = mongoose.model("Post", postSchema);
