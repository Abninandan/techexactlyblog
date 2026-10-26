const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");

const uploadDirectory = path.resolve(
	process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads")
);
const configuredSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB);
const maxUploadSizeMb = Number.isFinite(configuredSizeMb) && configuredSizeMb > 0
	? configuredSizeMb
	: 5;
const allowedImageTypes = new Map([
	[".jpg", "image/jpeg"],
	[".jpeg", "image/jpeg"],
	[".png", "image/png"],
	[".webp", "image/webp"],
	[".gif", "image/gif"],
]);

const storage = multer.diskStorage({
	destination: (req, file, callback) => {
		fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
			callback(error, uploadDirectory);
		});
	},
	filename: (req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase().slice(0, 16);
		callback(null, `${crypto.randomUUID()}${extension}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: Math.floor(maxUploadSizeMb * 1024 * 1024), files: 10 },
	fileFilter: (req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();
		if (allowedImageTypes.get(extension) !== file.mimetype) {
			return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
		}
		return callback(null, true);
	},
});

module.exports = upload;
module.exports.uploadDirectory = uploadDirectory;