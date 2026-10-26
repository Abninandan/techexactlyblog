import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminApi } from "../../services/adminApi";
import { userApi } from "../../services/userApi";
import "./Admin.css";

const defaultBranding = {
	companyName: "Threadline",
	shortDescription: "Thoughtful stories, shared by everyone.",
	logoUrl: "",
};

function AdminLogin() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [branding, setBranding] = useState(defaultBranding);

	useEffect(() => {
		let active = true;
		userApi.getBranding()
			.then(({ data }) => { if (active) setBranding({ ...defaultBranding, ...data }); })
			.catch((error) => toast.error(`Could not load site branding: ${error.message}`));
		return () => { active = false; };
	}, []);

	if (adminApi.hasSession()) {
		return <Navigate to="/admin" replace />;
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		try {
			await adminApi.login(email, password);
			toast.success("Signed in successfully.");
			navigate("/admin", { replace: true });
		} catch (loginError) {
			toast.error(loginError.message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="admin-login-page">
			<section className="admin-login-card">
				<Link className="admin-brand" to="/">
					{branding.logoUrl
						? <img className="admin-brand-logo" src={userApi.getMediaUrl(branding.logoUrl)} alt="" />
						: <span className="admin-brand-mark">{branding.companyName.slice(0, 1).toUpperCase()}</span>}
					<span className="admin-brand-copy">{branding.companyName}<small>ADMIN</small></span>
				</Link>
				<p className="admin-eyebrow">CONTENT OPERATIONS</p>
				<h1>Welcome back.</h1>
				<p className="admin-login-description">
					Sign in with an administrator account to manage your publication.
				</p>
				<form onSubmit={handleSubmit}>
					<label htmlFor="admin-email">Email address</label>
					<input
						autoComplete="username"
						id="admin-email"
						onChange={(event) => setEmail(event.target.value)}
						placeholder="admin@example.com"
						required
						type="email"
						value={email}
					/>
					<label htmlFor="admin-password">Password</label>
					<input
						autoComplete="current-password"
						id="admin-password"
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Your password"
						required
						type="password"
						value={password}
					/>
					<button className="admin-primary-button admin-login-button" disabled={submitting}>
						{submitting ? "Signing in…" : "Sign in to dashboard"}
					</button>
				</form>
				<p className="admin-login-footnote">Administrator access only</p>
			</section>
			<aside className="admin-login-aside">
				<div className="admin-aside-copy">
					<p className="admin-eyebrow">YOUR STORIES, IN GOOD HANDS</p>
					<h2>A quieter space to do your best work.</h2>
					<p>{branding.shortDescription}</p>
				</div>
				<div className="admin-aside-note">WRITE WITH INTENTION <span>—</span> PUBLISH WITH CARE</div>
			</aside>
		</main>
	);
}

export { AdminLogin };
