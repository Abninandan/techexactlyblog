import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { userApi } from "../services/userApi";
import { PostCard } from "./PostCard";

const AuthorPage = () => {
	const { authorId } = useParams();
	const [result, setResult] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, pages: 1, limit: 10 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		setLoading(true);
		userApi.getAuthor(authorId, { page: pagination.page, limit: 10 })
			.then((response) => {
				if (active) {
					setResult(response.data);
					setPagination(response.pagination);
					setError("");
				}
			})
			.catch((requestError) => { if (active) setError(requestError.message); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [authorId, pagination.page]);

	return (
		<section className="author-page">
			{loading && <p className="state-message">Loading author…</p>}
			{error && <p className="state-message error-message">{error}</p>}
			{result && (
				<>
					<div className="author-hero">
						<span className="author-avatar author-avatar-large">{result.author.name?.charAt(0)?.toUpperCase()}</span>
						<div><p className="eyebrow">Author profile</p><h1>{result.author.name}</h1><p>{pagination.total} published {pagination.total === 1 ? "story" : "stories"}</p></div>
					</div>
					<div className="feed-heading"><h2>Stories by {result.author.name}</h2></div>
					{result.posts.length ? result.posts.map((post) => <PostCard key={post._id} post={post} />) : <div className="empty-state"><h3>No published stories</h3><p>This author has not published a public story yet.</p></div>}
					{pagination.pages > 1 && (
						<div className="feed-pagination">
							<button disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
							<span>Page {pagination.page} of {pagination.pages}</span>
							<button disabled={pagination.page >= pagination.pages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
						</div>
					)}
				</>
			)}
		</section>
	);
};

export default AuthorPage;
