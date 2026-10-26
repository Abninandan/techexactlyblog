import { navigation } from "../constants";
import "../Admin.css";

function AdminOverview({ dashboard, loading, onNavigate }) {
	const totals = dashboard?.totals || {};
	return (
		<>
			<div className="admin-stat-grid">
				<StatCard label="Registered readers" marker="01" value={totals.users} loading={loading} />
				<StatCard label="Published stories" marker="02" value={totals.posts} loading={loading} />
				<StatCard label="Reader comments" marker="03" value={totals.comments} loading={loading} />
			</div>
			<section className="admin-panel admin-overview-panel">
				<div className="admin-section-heading">
					<div><p className="admin-eyebrow">QUICK ACCESS</p><h2>Keep things moving.</h2></div>
					<span className="admin-soft-label">YOUR WORKSPACE</span>
				</div>
				<div className="admin-quick-links">
					{navigation.slice(1).map((item) => (
						<button className="admin-quick-link" key={item.id} onClick={() => onNavigate(item.id)}>
							<span className="admin-quick-marker">{item.marker}</span>
							<span><strong>Manage {item.label.toLowerCase()}</strong><small>Review, search, and make changes</small></span>
							<span className="admin-quick-arrow">→</span>
						</button>
					))}
				</div>
			</section>
			<div className="admin-welcome-note">
				<span>EDITOR’S NOTE</span>
				<p>Good publishing is a conversation. Thanks for keeping yours thoughtful.</p>
			</div>
		</>
	);
}

function StatCard({ label, marker, value, loading }) {
	return (
		<article className="admin-stat-card">
			<div className="admin-stat-top"><span>{label}</span><span className="admin-stat-marker">{marker}</span></div>
			<strong>{loading ? "—" : (value ?? 0).toLocaleString()}</strong>
			<span className="admin-stat-caption">CURRENT TOTAL</span>
		</article>
	);
}

export { AdminOverview };
