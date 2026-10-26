const cors = require("cors");
const express = require("express");
const adminRoutes = require("./Route/adminRoutes");
const authRoutes = require("./Route/authRoutes");
const brandingRoutes = require("./Route/brandingRoutes");
const postRoutes = require("./Route/postRoutes");
const { setPostRating } = require("./Controller/RatingController");
const authenticateToken = require("./Middleware/authMiddleware");
const requireRole = require("./Middleware/requireRole");
const upload = require("./utils/upload");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(upload.uploadDirectory, { index: false, dotfiles: "deny" }));

app.get("/", (req, res) => {
	res.json({ message: "Blog API running" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/posts", postRoutes);
app.put("/api/posts/:postId/rating", authenticateToken, requireRole("user"), setPostRating);

app.use((req, res) => {
	res.status(404).json({ error: { message: "Route not found" } });
});

app.use((error, req, res, next) => {
	if (res.headersSent) {
		return next(error);
	}
	if (error.name === "MulterError") {
		const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
		return res.status(status).json({ message: error.message });
	}
	console.error("Request failed:", error);
	return res.status(500).json({ error: { message: "Internal server error" } });
});

module.exports = app;
