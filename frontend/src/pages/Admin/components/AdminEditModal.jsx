import "../Admin.css";

function AdminEditModal({ activeModule, editTitle, editContent, saving, onTitleChange, onContentChange, onClose, onSubmit }) {
	return (
		<div className="admin-modal-backdrop" onMouseDown={(event) => {
			if (event.target === event.currentTarget) onClose();
		}}>
			<form aria-labelledby="admin-edit-title" className="admin-modal" onSubmit={onSubmit}>
				<p className="admin-eyebrow">MAKE AN UPDATE</p>
				<h2 id="admin-edit-title">Edit {activeModule === "posts" ? "post" : "comment"}</h2>
				{activeModule === "posts" && (
					<>
						<label htmlFor="edit-title">Title</label>
						<input id="edit-title" maxLength={200} onChange={(event) => onTitleChange(event.target.value)} required value={editTitle} />
					</>
				)}
				<label htmlFor="edit-content">{activeModule === "posts" ? "Content" : "Comment"}</label>
				<textarea id="edit-content" onChange={(event) => onContentChange(event.target.value)} required rows={7} value={editContent} />
				<div className="admin-modal-actions">
					<button className="admin-secondary-button" onClick={onClose} type="button">Cancel</button>
					<button className="admin-primary-button" disabled={saving} type="submit">
						{saving ? "Saving…" : "Save changes"}
					</button>
				</div>
			</form>
		</div>
	);
}

export { AdminEditModal };
