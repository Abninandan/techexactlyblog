const fs = require("node:fs/promises");
const path = require("node:path");
const { z } = require("zod");
const { SiteBranding } = require("../Model/Mongodb");
const { uploadDirectory } = require("../utils/upload");

const DEFAULT_BRANDING = {
	companyName: "Threadline",
	shortDescription: "Thoughtful stories, shared by everyone.",
	logoUrl: "",
};
const brandingSchema = z.object({
	companyName: z.string().trim().min(1).max(100).optional(),
	shortDescription: z.string().trim().max(240).optional(),
	removeLogo: z.enum(["true", "false"]).optional(),
});

const getPublicBranding = async (req, res) => {
	const branding = await SiteBranding.findById("site-branding")
		.select("companyName shortDescription logoUrl")
		.lean();
	return res.json({ data: { ...DEFAULT_BRANDING, ...branding } });
};

const getAdminBranding = getPublicBranding;

const removeUpload = async (file) => {
	if (!file) return;
	try {
		await fs.unlink(file.path);
	} catch (error) {
		if (error.code !== "ENOENT") {
			console.error("Could not clean up a branding logo upload:", error);
		}
	}
};

const removeStoredLogo = async (logoUrl) => {
	if (!logoUrl || !logoUrl.startsWith("/uploads/")) return;
	const filename = path.basename(logoUrl);
	if (!filename || filename !== logoUrl.slice("/uploads/".length)) return;
	try {
		await fs.unlink(path.join(uploadDirectory, filename));
	} catch (error) {
		if (error.code !== "ENOENT") {
			console.error("Could not remove the previous branding logo:", error);
		}
	}
};

const updateBranding = async (req, res) => {
	const parsed = brandingSchema.safeParse(req.body ?? {});
	if (!parsed.success) {
		await removeUpload(req.file);
		return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid branding details" });
	}
	if (!Object.keys(parsed.data).length && !req.file) {
		return res.status(400).json({ message: "Provide company name, short description, or a logo" });
	}
	if (req.file && parsed.data.removeLogo === "true") {
		await removeUpload(req.file);
		return res.status(400).json({ message: "Upload a logo or remove the current logo, not both" });
	}

	const updates = {};
	if (parsed.data.companyName !== undefined) updates.companyName = parsed.data.companyName;
	if (parsed.data.shortDescription !== undefined) updates.shortDescription = parsed.data.shortDescription;
	if (req.file) updates.logoUrl = `/uploads/${req.file.filename}`;
	if (parsed.data.removeLogo === "true") updates.logoUrl = "";
	if (Object.keys(updates).length === 0) {
		await removeUpload(req.file);
		return res.status(400).json({ message: "No branding changes provided" });
	}

	const previous = await SiteBranding.findById("site-branding").select("logoUrl").lean();
	try {
		const branding = await SiteBranding.findByIdAndUpdate(
			"site-branding",
			{ $set: updates },
			{ upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
		).select("companyName shortDescription logoUrl").lean();
		if (req.file || parsed.data.removeLogo === "true") {
			await removeStoredLogo(previous?.logoUrl);
		}
		return res.json({ message: "Branding updated", data: { ...DEFAULT_BRANDING, ...branding } });
	} catch (error) {
		await removeUpload(req.file);
		throw error;
	}
};

const updateBrandingWithLogo = (req, res, next) => {
	const upload = require("../utils/upload");
	upload.single("logo")(req, res, (error) => {
		if (error) return next(error);
		return updateBranding(req, res).catch(next);
	});
};

module.exports = { getPublicBranding, getAdminBranding, updateBrandingWithLogo };
