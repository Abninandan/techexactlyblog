import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useUserAuth } from "../Context/UserAuthContext";
import { userApi } from "../services/userApi";
import { PostCard } from "./PostCard";

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
	month: "long",
	day: "numeric",
	year: "numeric",
});

const PostDetail = () => {
	const { slug } = useParams();
	const navigate = useNavigate();
	const { user } = useUserAuth();
	const [post, setPost] = useState(null);
	const [commentText, setCommentText] = useState("");
	const [editingComment, setEditingComment] = useState("");
	const [editingContent, setEditingContent] = useState("");
	const [editingPost, setEditingPost] = useState(false);
	const [postTitle, setPostTitle] = useState("");
	const [postContent, setPostContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const isOwner = Boolean(user && post && String(user.id) === String(post.author?._id));

	const loadPost = async () => {
		const response = await userApi.getPost(slug);
		setPost(response.data);
		setPostTitle(response.data.title);
		setPostContent(response.data.content);
	};

	useEffect(() => {
		let active = true;
		setLoading(true);
		userApi.getPost(slug)
			.then((response) => {
				if (active) {
					setPost(response.data);
					setPostTitle(response.data.title);
					setPostContent(response.data.content);
					setError("");
				}
			})
			.catch((requestError) => { if (active) setError(requestError.message); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [slug]);

	const requireLogin = () => {
		toast.info("Log in to join the conversation");
		navigate("/login");
	};

	const submitComment = async (event) => {
		event.preventDefault();
		try {
			await userApi.createComment(post._id, commentText);
			setCommentText("");
			await loadPost();
			toast.success("Comment posted");
		} catch (requestError) {
			toast.error(requestError.message);
		}
	};

	const saveComment = async (commentId) => {
		try {
			await userApi.updateComment(commentId, editingContent);
			setEditingComment("");
			await loadPost();
			toast.success("Comment updated");
		} catch (requestError) {
			toast.error(requestError.message);
		}
	};

	const deleteComment = async (commentId) => {
		const confirmation = await Swal.fire({
			title: "Delete this comment?",
			text: "This action cannot be undone.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Delete comment",
			confirmButtonColor: "#b54735",
		});
		if (!confirmation.isConfirmed) return;
		try {
			await userApi.deleteComment(commentId);
			await loadPost();
			toast.success("Comment deleted");
		} catch (requestError) {
			toast.error(requestError.message);
		}
	};

	const savePost = async (event) => {
		event.preventDefault();
		try {
			const response = await userApi.updatePost(post._id, { title: postTitle, content: postContent });
			toast.success("Story updated");
			setEditingPost(false);
			if (response.data.slug !== slug) navigate(`/posts/${response.data.slug}`, { replace: true });
			else await loadPost();
		} catch (requestError) {
			toast.error(requestError.message);
		}
	};

	const deletePost = async () => {
		const confirmation = await Swal.fire({
			title: "Delete this story?",
			text: "Your story will be removed from the public feed.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Delete story",
			confirmButtonColor: "#b54735",
		});
		if (!confirmation.isConfirmed) return;
		try {
			await userApi.deletePost(post._id);
			toast.success("Story deleted");
			navigate("/");
		} catch (requestError) {
			toast.error(requestError.message);
		}
	};

	if (loading) return <p className="state-message">Loading story…</p>;
	if (error || !post) return <div className="state-message error-message">{error || "Post not found"}</div>;

	return (
		<div className="story-layout">
			<article className="story-content">
				<Link className="back-link" to="/">← Back to stories</Link>
				<div className="story-meta"><Link className="author-link" to={`/authors/${post.author?._id}`}>{post.author?.name}</Link><span>·</span><time>{formatDate(post.createdAt)}</time></div>
				{editingPost ? (
					<form className="blog-form edit-post-form" onSubmit={savePost}>
						<label>Title<input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} maxLength="200" required /></label>
						<label>Story<textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} rows="12" maxLength="100000" required /></label>
						<div className="form-actions"><button className="primary-button" type="submit">Save changes</button><button className="secondary-button" type="button" onClick={() => setEditingPost(false)}>Cancel</button></div>
					</form>
				) : (
					<>
						<div className="story-title-row"><h1>{post.title}</h1>{isOwner && <div className="owner-actions"><button onClick={() => setEditingPost(true)}>Edit</button><button className="danger-action" onClick={deletePost}>Delete</button></div>}</div>
						<div className="story-body">{post.content}</div>
					</>
				)}
				{post.images?.length > 0 && (
					<div className="story-gallery">
						{post.images.map((image) => <img key={image._id} src={userApi.getMediaUrl(image.url)} alt={image.originalName || "Post image"} />)}
					</div>
				)}
				<section className="comments-section">
					<div className="feed-heading"><h2>Conversation</h2><span>{post.comments.length} comments</span></div>
					{user ? (
						<form className="comment-form" onSubmit={submitComment}>
							<label className="sr-only" htmlFor="new-comment">Add a comment</label>
							<textarea id="new-comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength="5000" placeholder="Add something thoughtful…" required />
							<button className="primary-button" type="submit" disabled={!commentText.trim()}>Comment</button>
						</form>
					) : <button className="login-prompt" onClick={requireLogin}>Log in to add a comment</button>}
					<div className="comment-list">
						{post.comments.map((comment) => {
							const ownsComment = user && String(user.id) === String(comment.author?._id);
							return (
								<article className="comment-item" key={comment._id}>
									<div className="comment-byline"><Link to={`/authors/${comment.author?._id}`}>{comment.author?.name}</Link><time>{formatDate(comment.createdAt)}</time></div>
									{editingComment === comment._id ? (
										<div className="comment-edit"><textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} maxLength="5000" /><div className="form-actions"><button className="primary-button" onClick={() => saveComment(comment._id)}>Save</button><button className="secondary-button" onClick={() => setEditingComment("")}>Cancel</button></div></div>
									) : <p>{comment.content}</p>}
									{ownsComment && editingComment !== comment._id && <div className="comment-actions"><button onClick={() => { setEditingComment(comment._id); setEditingContent(comment.content); }}>Edit</button><button className="danger-action" onClick={() => deleteComment(comment._id)}>Delete</button></div>}
								</article>
							);
						})}
						{post.comments.length === 0 && <p className="muted-copy">Be the first to comment on this story.</p>}
					</div>
				</section>
			</article>
			{post.relatedPosts?.length > 0 && <aside className="related-stories"><p className="eyebrow">Keep reading</p><h2>More from the community</h2>{post.relatedPosts.map((related) => <PostCard key={related._id} post={related} />)}</aside>}
		</div>
	);
};

export default PostDetail;
