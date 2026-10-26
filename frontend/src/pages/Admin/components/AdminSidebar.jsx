import { Link } from "react-router-dom";
import { adminApi } from "../../../services/adminApi";
import { navigation } from "../constants";
import "../Admin.css";

function AdminSidebar({ activeModule, branding, userCount, onNavigate, onSignOut }) {
	const companyName = branding?.companyName || "Threadline";
	return (
		<aside className="admin-sidebar">
			<Link className="admin-brand" to="/admin" aria-label={`${companyName} admin dashboard`}>
				{branding?.logoUrl
					? <img className="admin-brand-logo" src={adminApi.getMediaUrl(branding.logoUrl)} alt="" />
					: <span className="admin-brand-mark">{companyName.slice(0, 1).toUpperCase()}</span>}
				<span className="admin-brand-copy">{companyName}<small>ADMIN</small></span>
			</Link>
			<div className="admin-side-label">WORKSPACE</div>
			<nav aria-label="Admin sections" className="admin-nav">
				{navigation.map((item) => (
					<button
						aria-current={activeModule === item.id ? "page" : undefined}
						className={activeModule === item.id ? "admin-nav-item active" : "admin-nav-item"}
						key={item.id}
						onClick={() => onNavigate(item.id)}
					>
						<span className="admin-nav-marker">{item.marker}</span>
						{item.label}
						{item.id === "users" && userCount > 0 && (
							<span className="admin-nav-count">{userCount}</span>
						)}
					</button>
				))}
			</nav>
			<div className="admin-sidebar-bottom">
				<div className="admin-sidebar-note">{branding?.shortDescription || "Thoughtful stories, shared by everyone."}</div>
				<button className="admin-signout" onClick={onSignOut}>
					<span className="admin-nav-marker">↗</span> Sign out
				</button>
			</div>
		</aside>
	);
}

export { AdminSidebar };
