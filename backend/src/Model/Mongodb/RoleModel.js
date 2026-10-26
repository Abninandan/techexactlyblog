const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
	{
		code: {
			type: Number,
			required: true,
			unique: true,
			min: 1,
		},
		name: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		description: {
			type: String,
			default: "",
		},
	},
	{
		collection: "roles",
		timestamps: true,
	}
);

module.exports = mongoose.model("Role", roleSchema);