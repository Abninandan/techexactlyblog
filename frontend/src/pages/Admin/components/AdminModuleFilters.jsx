import "../Admin.css";

function AdminModuleFilters({ activeModule, filters, onChange, onSubmit }) {
	const change = (key) => (event) => onChange({ ...filters, [key]: event.target.value });
	return (
		<form className="admin-filter-bar" onSubmit={onSubmit}>
			{activeModule === "users" && (
				<>
					<label className="admin-filter-field admin-filter-grow">
						<span>Search users</span>
						<input onChange={change("search")} placeholder="Search by name" value={filters.search} />
					</label>
					<label className="admin-filter-field">
						<span>Status</span>
						<select onChange={change("status")} value={filters.status}>
							<option value="">All statuses</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</label>
				</>
			)}
			{activeModule === "posts" && (
				<>
					<label className="admin-filter-field">
						<span>Post title</span>
						<input onChange={change("title")} placeholder="Search title" value={filters.title} />
					</label>
					<label className="admin-filter-field">
						<span>Author name</span>
						<input onChange={change("userName")} placeholder="Search author" value={filters.userName} />
					</label>
					<label className="admin-filter-field admin-filter-rating">
						<span>Rating from</span>
						<input aria-label="Minimum rating" max="5" min="0" onChange={change("minRating")} placeholder="0" step="0.1" type="number" value={filters.minRating} />
					</label>
					<label className="admin-filter-field admin-filter-rating">
						<span>Rating to</span>
						<input aria-label="Maximum rating" max="5" min="0" onChange={change("maxRating")} placeholder="5" step="0.1" type="number" value={filters.maxRating} />
					</label>
				</>
			)}
			{activeModule !== "users" && (
				<label className="admin-filter-field">
					<span>Status</span>
					<select onChange={change("status")} value={filters.status}>
						<option value="">All statuses</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</label>
			)}
			<button className="admin-primary-button admin-filter-submit" type="submit">Apply filters</button>
		</form>
	);
}

export { AdminModuleFilters };
