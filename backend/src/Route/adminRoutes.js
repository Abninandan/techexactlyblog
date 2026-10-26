const express = require("express");
const {
	dashboard,
	deleteComment,
	getPostImages,
	listComments,
	listPosts,
	listRegularUsers,
	login,
	softDeletePost,
	updateCommentStatus,
	updateComment,
	updatePost,
	updatePostStatus,
	updateUserStatus,
	uploadPostImages,
} = require("../Controller/AdminController");
const requireAdmin = require("../Middleware/adminMiddleware");
const authRateLimit = require("../Middleware/authRateLimit");
const upload = require("../utils/upload");
const { getAdminBranding, updateBrandingWithLogo } = require("../Controller/BrandingController");

const router = express.Router();

router.post("/login", authRateLimit, login);
router.get("/dashboard", requireAdmin, dashboard);
router.get("/branding", requireAdmin, getAdminBranding);
router.put("/branding", requireAdmin, updateBrandingWithLogo);
router.get("/users", requireAdmin, listRegularUsers);
router.patch("/users/:userId/status", requireAdmin, updateUserStatus);
router.get("/posts", requireAdmin, listPosts);
router.get("/posts/:postId/images", requireAdmin, getPostImages);
router.post("/posts/:postId/images", requireAdmin, upload.array("images", 10), uploadPostImages);
router.patch("/posts/:postId", requireAdmin, updatePost);
router.patch("/posts/:postId/status", requireAdmin, updatePostStatus);
router.delete("/posts/:postId", requireAdmin, softDeletePost);
router.get("/comments", requireAdmin, listComments);
router.patch("/comments/:commentId", requireAdmin, updateComment);
router.delete("/comments/:commentId", requireAdmin, deleteComment);
router.patch("/comments/:commentId/status", requireAdmin, updateCommentStatus);

module.exports = router;