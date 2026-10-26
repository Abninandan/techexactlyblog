import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../services/userApi";
import { PostCard } from "./PostCard";

export const Home = () => {
	const [posts, setPosts] = useState([]);
	const [authors, setAuthors] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, pages: 1, limit: 10 });
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		setLoading(true);
		Promise.all([
			userApi.getPosts({ page: pagination.page, limit: 10, search: query }),
			userApi.getAuthors(),
		])
			.then(([postResponse, authorResponse]) => {
				if (!active) return;
				setPosts(postResponse.data);
				setPagination(postResponse.pagination);
				setAuthors(authorResponse.data);
				setError("");
			})
			.catch((requestError) => {
				if (active) setError(requestError.message);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => { active = false; };
	}, [pagination.page, query]);

	const submitSearch = (event) => {
		event.preventDefault();
		setPagination((current) => ({ ...current, page: 1 }));
		setQuery(search.trim());
	};

	return (
		<div className="feed-layout">
			<section className="feed-content">
				<div className="feed-hero">
					<div>
						<p className="eyebrow">A little more human</p>
						<h1>Home</h1>
						<p>Ideas, experiences, and stories from people worth listening to.</p>
					</div>
					<Link className="primary-button" to="/write">Share a story <span aria-hidden="true">↗</span></Link>
				</div>
				<form className="feed-search" onSubmit={submitSearch}>
					<label className="sr-only" htmlFor="post-search">Search stories</label>
					<input id="post-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stories by title" />
					<button type="submit">Search</button>
				</form>
				<div className="feed-heading">
					<h2>{query ? `Search results for “${query}”` : "Latest stories"}</h2>
					<span>{pagination.total || 0} stories</span>
				</div>
				{loading && <p className="state-message">Loading stories…</p>}
				{!loading && error && <div className="state-message error-message">{error}</div>}
				{!loading && !error && posts.length === 0 && (
					<div className="empty-state"><h3>No stories yet</h3><p>Try a different search or be the first to share one.</p></div>
				)}
				{!loading && !error && posts.map((post) => <PostCard key={post._id} post={post} />)}
				{pagination.pages > 1 && (
					<div className="feed-pagination">
						<button disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
						<span>Page {pagination.page} of {pagination.pages}</span>
						<button disabled={pagination.page >= pagination.pages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
					</div>
				)}
			</section>
			<aside className="feed-sidebar">
				<div className="sidebar-panel">
					<p className="eyebrow">The community</p>
					<h2>Meet the authors</h2>
					<p>Find a new perspective from someone in the community.</p>
					<div className="author-list">
						{authors.map((author) => (
							<Link className="author-row" to={`/authors/${author._id}`} key={author._id}>
								<span className="author-avatar">{author.name?.charAt(0)?.toUpperCase() || "A"}</span>
								<span><strong>{author.name}</strong><small>{author.postCount} {author.postCount === 1 ? "story" : "stories"}</small></span>
								<span className="author-arrow" aria-hidden="true">↗</span>
							</Link>
						))}
						{authors.length === 0 && !loading && <p className="muted-copy">Authors will appear here as stories are published.</p>}
					</div>
				</div>
				<div className="sidebar-note"><span aria-hidden="true">✳</span><p>Good writing starts with being curious. Go explore.</p></div>
			</aside>
		</div>
	);
};
