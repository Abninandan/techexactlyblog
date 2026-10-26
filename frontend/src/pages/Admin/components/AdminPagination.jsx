import "../Admin.css";

function AdminPagination({ pagination, limit, onLimitChange, onPageChange }) {
	if (!pagination) return null;
	const pages = Math.max(1, pagination.pages);
	return (
		<div className="admin-pagination">
			<span>
				Page {pagination.page} of {pages} · {pagination.total} records
			</span>
			<div>
				<label className="admin-page-size">
					Rows per page
					<select aria-label="Rows per page" onChange={(event) => onLimitChange(Number(event.target.value))} value={limit}>
						<option value={10}>10</option>
						<option value={20}>20</option>
						<option value={100}>100</option>
					</select>
				</label>
				<button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
					Previous
				</button>
				<button disabled={pagination.page >= pages} onClick={() => onPageChange(pagination.page + 1)}>
					Next
				</button>
			</div>
		</div>
	);
}

export { AdminPagination };
