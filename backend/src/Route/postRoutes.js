const express = require("express");
const {
	createComment,
	createPostWithImages,
	deleteOwnComment,
	deleteOwnPost,
	getAuthorPosts,
	getPost,
	listAuthors,
	listPosts,
	updateOwnComment,
	updateOwnPost,
} = require("../Controller/PostController");
const authenticateToken = require("../Middleware/authMiddleware");
const requireRole = require("../Middleware/requireRole");
const requireRegularUser = requireRole("user");

const router = express.Router();

router.get("/", listPosts);
router.get("/authors", listAuthors);
router.get("/authors/:authorId", getAuthorPosts);
router.get("/:slug", getPost);
router.post("/", authenticateToken, requireRegularUser, createPostWithImages);
router.patch("/:postId", authenticateToken, requireRegularUser, updateOwnPost);
router.delete("/:postId", authenticateToken, requireRegularUser, deleteOwnPost);
router.post("/:postId/comments", authenticateToken, requireRegularUser, createComment);
router.patch("/comments/:commentId", authenticateToken, requireRegularUser, updateOwnComment);
router.delete("/comments/:commentId", authenticateToken, requireRegularUser, deleteOwnComment);

module.exports = router;
