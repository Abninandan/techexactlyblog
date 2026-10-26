const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		tokenHash: {
			type: String,
			required: true,
			unique: true,
			select: false,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
		revokedAt: {
			type: Date,
			default: null,
		},
		replacedByToken: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "RefreshToken",
			default: null,
		},
	},
	{
		collection: "refresh_tokens",
		timestamps: true,
	}
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
