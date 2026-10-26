import { useRef } from "react";
import { adminApi } from "../../../services/adminApi";
import "../Admin.css";

function PostImagesCell({ post, disabled, onView, onUpload }) {
	const fileInput = useRef(null);

	return (
		<div className="admin-post-images-cell">
			<button
				aria-label={`View ${post.imageCount || 0} images for ${post.title}`}
				className="admin-image-preview"
				disabled={!post.imageCount}
				onClick={onView}
				title={post.imageCount ? "View post images" : "No images uploaded"}
				type="button"
			>
				{post.coverImage ? (
					<img alt="" src={adminApi.getMediaUrl(post.coverImage.url)} />
				) : (
					<span aria-hidden="true">＋</span>
				)}
			</button>
			<span className="admin-image-count">{post.imageCount || 0}</span>
			<input
				accept="image/jpeg,image/png,image/webp,image/gif"
				aria-label={`Select images for ${post.title}`}
				className="admin-image-file-input"
				multiple
				onChange={(event) => {
					const files = Array.from(event.target.files || []);
					if (files.length) onUpload(files);
					event.target.value = "";
				}}
				ref={fileInput}
				type="file"
			/>
			<button
				className="admin-row-action"
				disabled={disabled}
				onClick={() => fileInput.current?.click()}
				type="button"
			>
				Upload
			</button>
		</div>
	);
}

export { PostImagesCell };
