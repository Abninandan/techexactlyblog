import { displayDate } from "../constants";
import { PostImagesCell } from "./PostImagesCell";
import "../Admin.css";

function StatusBadge({ active }) {
	return <span className={active ? "admin-status active" : "admin-status inactive"}>{active ? "Active" : "Inactive"}</span>;
}

function ActionButton({ children, disabled, onClick, variant = "plain" }) {
	return <button className={`admin-row-action ${variant}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function UsersTable({ records, onToggle, savingId }) {
	return (
		<div className="admin-table-wrap">
			<table className="admin-table">
				<thead><tr><th>Reader</th><th>Status</th><th>Joined</th><th className="admin-align-right">Action</th></tr></thead>
				<tbody>{records.map((user) => (
					<tr key={user._id}>
						<td><div className="admin-person"><span className="admin-person-avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
						<td><StatusBadge active={user.isActive} /></td>
						<td>{displayDate(user.createdAt)}</td>
						<td className="admin-align-right"><ActionButton disabled={savingId === user._id} onClick={() => onToggle(user)} variant={user.isActive ? "warning" : "success"}>{user.isActive ? "Deactivate" : "Activate"}</ActionButton></td>
					</tr>
				))}</tbody>
			</table>
		</div>
	);
}

function PostsTable({ records, onToggle, onEdit, onDelete, onViewImages, onUploadImages, savingId }) {
	return (
		<div className="admin-table-wrap">
			<table className="admin-table">
				<thead><tr><th>Story</th><th>Images</th><th>Author</th><th>Rating</th><th>Status</th><th className="admin-align-right">Actions</th></tr></thead>
				<tbody>{records.map((post) => (
					<tr key={post._id}>
						<td><div className="admin-item-title"><strong>{post.title}</strong><small>{post.slug}</small></div></td>
						<td>
							<PostImagesCell
								disabled={savingId === post._id}
								onUpload={(files) => onUploadImages(post, files)}
								onView={() => onViewImages(post)}
								post={post}
							/>
						</td>
						<td>{post.author?.name || "Unknown"}</td>
						<td><span className="admin-rating">★ {Number(post.averageRating || 0).toFixed(1)}</span><small className="admin-rating-count">{post.ratingCount || 0} ratings</small></td>
						<td><StatusBadge active={post.isActive} /></td>
						<td className="admin-align-right admin-actions-cell">
							<ActionButton disabled={savingId === post._id} onClick={() => onEdit(post)}>Edit</ActionButton>
							<ActionButton disabled={savingId === post._id} onClick={() => onToggle(post)} variant={post.isActive ? "warning" : "success"}>{post.isActive ? "Hide" : "Publish"}</ActionButton>
							<ActionButton disabled={savingId === post._id} onClick={() => onDelete(post)} variant="danger">Delete</ActionButton>
						</td>
					</tr>
				))}</tbody>
			</table>
		</div>
	);
}

function CommentsTable({ records, onEdit, onDelete, onToggle, savingId }) {
	return (
		<div className="admin-table-wrap">
			<table className="admin-table">
				<thead><tr><th>Comment</th><th>Story</th><th>Reader</th><th>Status</th><th className="admin-align-right">Action</th></tr></thead>
				<tbody>{records.map((comment) => (
					<tr key={comment._id}>
						<td><div className="admin-item-title"><strong>{comment.content}</strong><small>{displayDate(comment.createdAt)}</small></div></td>
						<td>{comment.post?.title || "Story unavailable"}</td>
						<td>{comment.author?.name || "Unknown"}</td>
						<td><StatusBadge active={comment.isActive} /></td>
						<td className="admin-align-right admin-actions-cell">
							<ActionButton disabled={savingId === comment._id} onClick={() => onEdit(comment)}>Edit</ActionButton>
							<ActionButton disabled={savingId === comment._id} onClick={() => onToggle(comment)} variant={comment.isActive ? "warning" : "success"}>{comment.isActive ? "Hide" : "Restore"}</ActionButton>
							<ActionButton disabled={savingId === comment._id} onClick={() => onDelete(comment)} variant="danger">Delete</ActionButton>
						</td>
					</tr>
				))}</tbody>
			</table>
		</div>
	);
}

export { CommentsTable, PostsTable, UsersTable };
