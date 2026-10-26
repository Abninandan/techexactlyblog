const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: 100,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			maxlength: 254,
		},
		password: {
			type: String,
			default: undefined,
		},
		googleId: {
			type: String,
			default: undefined,
		},
		facebookId: {
			type: String,
			default: undefined,
		},
		avatarUrl: {
			type: String,
			trim: true,
			default: "",
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		collection: "users",
		timestamps: true,
	}
);

userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ facebookId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
