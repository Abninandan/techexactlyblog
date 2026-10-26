import { useState } from "react";
import { adminApi } from "../../../services/adminApi";
import "../Admin.css";

function AdminImageGallery({ post, images, onClose }) {
	const [selectedImage, setSelectedImage] = useState(images[0]);

	return (
		<div className="admin-gallery-backdrop" onMouseDown={(event) => {
			if (event.target === event.currentTarget) onClose();
		}}>
			<section aria-labelledby="admin-gallery-title" aria-modal="true" className="admin-gallery" role="dialog">
				<header className="admin-gallery-header">
					<div>
						<p className="admin-eyebrow">POST IMAGES</p>
						<h2 id="admin-gallery-title">{post.title}</h2>
						<p>{images.length} {images.length === 1 ? "image" : "images"}</p>
					</div>
					<button aria-label="Close image gallery" className="admin-gallery-close" onClick={onClose} type="button">×</button>
				</header>
				<div className="admin-gallery-main">
					<img alt={selectedImage.originalName} src={adminApi.getMediaUrl(selectedImage.url)} />
				</div>
				<div aria-label="All post images" className="admin-gallery-thumbnails">
					{images.map((image) => (
						<button
							aria-label={`Show ${image.originalName}`}
							aria-pressed={selectedImage._id === image._id}
							className={selectedImage._id === image._id ? "admin-gallery-thumbnail selected" : "admin-gallery-thumbnail"}
							key={image._id}
							onClick={() => setSelectedImage(image)}
							type="button"
						>
							<img alt="" src={adminApi.getMediaUrl(image.url)} />
						</button>
					))}
				</div>
			</section>
		</div>
	);
}

export { AdminImageGallery };
