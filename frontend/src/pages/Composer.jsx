import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { userApi } from "../services/userApi";

const Composer = () => {
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [images, setImages] = useState([]);
	const [error, setError] = useState("");

	const handleImages = (event) => {
		const files = Array.from(event.target.files || []);
		if (files.length > 10) {
			setError("Choose no more than 10 images.");
			event.target.value = "";
			setImages([]);
			return;
		}
		const invalidFile = files.find((file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024);
		if (invalidFile) {
			setError("Images must be JPEG, PNG, WebP, or GIF and no larger than 5 MB each.");
			event.target.value = "";
			setImages([]);
			return;
		}
		setError("");
		setImages(files);
	};

	const submit = async (event) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		form.delete("images");
		images.forEach((image) => form.append("images", image));
		setBusy(true);
		setError("");
		try {
			const response = await userApi.createPost(form);
			toast.success("Your story is live");
			navigate(`/posts/${response.data.slug}`);
		} catch (requestError) {
			setError(requestError.message);
			toast.error(requestError.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="composer-page">
			<Link className="back-link" to="/">← Back to stories</Link>
			<div className="auth-intro"><p className="eyebrow">Your words belong here</p><h1>Write a story</h1><p>Share an idea, a lesson, or something you can’t stop thinking about.</p></div>
			<form className="blog-form composer-form" onSubmit={submit}>
				<label>Title<input name="title" placeholder="Give your story a title" maxLength="200" required /></label>
				<label>Your story<textarea name="content" placeholder="Start writing…" rows="14" maxLength="100000" required /></label>
				<label className="image-picker">Add images <span>Up to 10 images · JPEG, PNG, WebP or GIF · 5 MB each</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImages} /></label>
				{images.length > 0 && <p className="selected-files">{images.length} image{images.length === 1 ? "" : "s"} selected: {images.map(({ name }) => name).join(", ")}</p>}
				{error && <p className="form-error" role="alert">{error}</p>}
				<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish story"}</button>
			</form>
		</section>
	);
};

export default Composer;
