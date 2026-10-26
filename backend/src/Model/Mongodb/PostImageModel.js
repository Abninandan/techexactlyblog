const mongoose = require("mongoose");

const postImageSchema = new mongoose.Schema(
	{
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			required: true,
		},
		url: {
			type: String,
			required: true,
			trim: true,
		},
		originalName: {
			type: String,
			required: true,
			trim: true,
		},
		mimeType: {
			type: String,
			required: true,
			enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
		},
		size: {
			type: Number,
			required: true,
			min: 1,
		},
	},
	{
		collection: "post_images",
		timestamps: true,
	}
);

postImageSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model("PostImage", postImageSchema);
