import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUserAuth } from "../Context/UserAuthContext";
import { userApi } from "../services/userApi";
import "./PublicBlog.css";

const defaultBranding = {
	companyName: "Threadline",
	shortDescription: "Thoughtful stories, shared by everyone.",
	logoUrl: "",
};

const PublicLayout = () => {
	const { user, signOut } = useUserAuth();
	const navigate = useNavigate();
	const [branding, setBranding] = useState(defaultBranding);

	useEffect(() => {
		let active = true;
		userApi.getBranding()
			.then(({ data }) => { if (active) setBranding({ ...defaultBranding, ...data }); })
			.catch((error) => { if (active) toast.error(`Could not load site branding: ${error.message}`); });
		return () => { active = false; };
	}, []);

	const handleSignOut = async () => {
		try {
			await signOut();
			toast.success("Signed out");
			navigate("/");
		} catch (error) {
			toast.error(error.message);
		}
	};

	return (
		<div className="blog-shell">
			<header className="blog-header">
				<Link className="blog-brand" to="/" aria-label={`${branding.companyName} home`}>
					{branding.logoUrl
						? <img className="blog-brand-logo" src={userApi.getMediaUrl(branding.logoUrl)} alt="" />
						: <span className="blog-brand-fallback">{branding.companyName.slice(0, 1).toUpperCase()}</span>}
					<span className="blog-brand-copy">
						<strong>{branding.companyName}</strong>
						<small>{branding.shortDescription}</small>
					</span>
				</Link>
				<nav className="blog-nav" aria-label="Main navigation">
					<NavLink to="/" end>Explore</NavLink>
					{user ? (
						<>
							<NavLink to="/write">Write</NavLink>
							<span className="blog-user-name">Hi, {user.name}</span>
							<button className="blog-link-button" onClick={handleSignOut}>Log out</button>
						</>
					) : (
						<>
							<NavLink to="/login">Log in</NavLink>
							<NavLink className="blog-nav-cta" to="/register">Join</NavLink>
						</>
					)}
				</nav>
			</header>
			<main className="blog-main"><Outlet /></main>
			<footer className="blog-footer">{branding.shortDescription}</footer>
		</div>
	);
};

export default PublicLayout;
