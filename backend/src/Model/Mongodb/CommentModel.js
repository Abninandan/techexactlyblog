const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
	{
		content: {
			type: String,
			required: true,
			trim: true,
			minlength: 1,
			maxlength: 5000,
		},
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			required: true,
		},
		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		collection: "comments",
		timestamps: true,
	}
);

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
