import "../Admin.css";

function AdminHeader({ admin, branding, title }) {
	return (
		<header className="admin-topbar">
			<div className="admin-breadcrumb">{branding?.companyName || "THREADLINE"} <span>/</span> {title.toUpperCase()}</div>
			<div className="admin-profile">
				<span className="admin-avatar">{(admin?.name || "A").slice(0, 1).toUpperCase()}</span>
				<span><strong>{admin?.name || "Administrator"}</strong><small>Administrator</small></span>
			</div>
		</header>
	);
}

export { AdminHeader };
