import { useEffect, useState } from "react";
import { adminApi } from "../../../services/adminApi";
import "../Admin.css";

function AdminBrandingSettings({ branding, loading, saving, onSubmit }) {
	const [companyName, setCompanyName] = useState("");
	const [shortDescription, setShortDescription] = useState("");
	const [logoFile, setLogoFile] = useState(null);
	const [removeLogo, setRemoveLogo] = useState(false);
	const [previewUrl, setPreviewUrl] = useState("");

	useEffect(() => {
		setCompanyName(branding?.companyName || "");
		setShortDescription(branding?.shortDescription || "");
		setLogoFile(null);
		setRemoveLogo(false);
	}, [branding]);

	useEffect(() => {
		if (!logoFile) {
			setPreviewUrl("");
			return undefined;
		}
		const objectUrl = URL.createObjectURL(logoFile);
		setPreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [logoFile]);

	const handleSubmit = (event) => {
		event.preventDefault();
		const formData = new FormData();
		formData.set("companyName", companyName);
		formData.set("shortDescription", shortDescription);
		if (logoFile) formData.set("logo", logoFile);
		if (removeLogo) formData.set("removeLogo", "true");
		onSubmit(formData);
	};

	const currentLogo = previewUrl || (
		branding?.logoUrl ? adminApi.getMediaUrl(branding.logoUrl) : ""
	);

	return (
		<section className="admin-branding-panel admin-panel">
			<div className="admin-branding-intro">
				<p className="admin-eyebrow">PUBLIC SITE IDENTITY</p>
				<h2>Company branding</h2>
				<p>These details appear in the public site header and the admin workspace sidebar.</p>
			</div>
			{loading ? <div className="admin-empty">Loading branding…</div> : (
				<form className="admin-branding-form" onSubmit={handleSubmit}>
					<label htmlFor="branding-name">Company or project name</label>
					<input
						id="branding-name"
						maxLength="100"
						onChange={(event) => setCompanyName(event.target.value)}
						required
						value={companyName}
					/>
					<label htmlFor="branding-description">Short description</label>
					<textarea
						id="branding-description"
						maxLength="240"
						onChange={(event) => setShortDescription(event.target.value)}
						rows="3"
						value={shortDescription}
					/>
					<div className="admin-branding-logo-row">
						<div>
							<label htmlFor="branding-logo">Company logo</label>
							<p>Upload one JPEG, PNG, WebP, or GIF image (up to 5 MB).</p>
							<input
								accept="image/jpeg,image/png,image/webp,image/gif"
								id="branding-logo"
								onChange={(event) => {
									const file = event.target.files?.[0] || null;
									setLogoFile(file);
									if (file) setRemoveLogo(false);
								}}
								type="file"
							/>
							{branding?.logoUrl && !logoFile && (
								<label className="admin-branding-remove">
									<input
										checked={removeLogo}
										onChange={(event) => setRemoveLogo(event.target.checked)}
										type="checkbox"
									/>
									Remove current logo
								</label>
							)}
						</div>
						<div className="admin-branding-preview" aria-label="Logo preview">
							{currentLogo && !removeLogo
								? <img src={currentLogo} alt="Current company logo preview" />
								: <span>{companyName.trim().slice(0, 1).toUpperCase() || "B"}</span>}
						</div>
					</div>
					<div className="admin-branding-actions">
						<button className="admin-primary-button" disabled={saving || !companyName.trim()} type="submit">
							{saving ? "Saving…" : "Save branding"}
						</button>
					</div>
				</form>
			)}
		</section>
	);
}

export { AdminBrandingSettings };
