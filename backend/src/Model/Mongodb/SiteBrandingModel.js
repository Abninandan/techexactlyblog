const mongoose = require("mongoose");

const siteBrandingSchema = new mongoose.Schema(
	{
		_id: {
			type: String,
			default: "site-branding",
		},
		companyName: {
			type: String,
			required: true,
			default: "Threadline",
			trim: true,
			maxlength: 100,
		},
		shortDescription: {
			type: String,
			default: "Thoughtful stories, shared by everyone.",
			trim: true,
			maxlength: 240,
		},
		logoUrl: {
			type: String,
			default: "",
			trim: true,
		},
	},
	{
		collection: "site_branding",
		timestamps: true,
	}
);

module.exports = mongoose.model("SiteBranding", siteBrandingSchema);
