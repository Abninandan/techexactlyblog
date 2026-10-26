import { Link } from "react-router-dom";
import { userApi } from "../services/userApi";

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export const PostCard = ({ post }) => (
	<article className="post-card">
		<div className="post-card-copy">
			<Link className="author-link" to={`/authors/${post.author?._id}`}>{post.author?.name || "Community member"}</Link>
			<span className="post-date">{formatDate(post.createdAt)}</span>
			<h2><Link to={`/posts/${post.slug}`}>{post.title}</Link></h2>
			<p>{post.content}</p>
			<div className="post-card-footer"><Link to={`/posts/${post.slug}`}>Read story <span aria-hidden="true">→</span></Link><span>{post.imageCount ? `${post.imageCount} photos` : "Article"}</span></div>
		</div>
		{post.coverImage && <Link className="post-card-image" to={`/posts/${post.slug}`}><img src={userApi.getMediaUrl(post.coverImage.url)} alt="" /></Link>}
	</article>
);
