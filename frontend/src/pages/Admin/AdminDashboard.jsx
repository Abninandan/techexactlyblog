import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminApi } from "../../services/adminApi";
import { navigation } from "./constants";
import { AdminEditModal } from "./components/AdminEditModal";
import { AdminBrandingSettings } from "./components/AdminBrandingSettings";
import { AdminHeader } from "./components/AdminHeader";
import { AdminImageGallery } from "./components/AdminImageGallery";
import { AdminModuleFilters } from "./components/AdminModuleFilters";
import { AdminOverview } from "./components/AdminOverview";
import { AdminPagination } from "./components/AdminPagination";
import { AdminSidebar } from "./components/AdminSidebar";
import { CommentsTable, PostsTable, UsersTable } from "./components/AdminTables";
import { confirmCommentDeletion, confirmPostDeletion } from "./utils/swal";
import "./Admin.css";

function AdminDashboard() {
	const navigate = useNavigate();
	const [admin] = useState(() => adminApi.getStoredUser());
	const [activeModule, setActiveModule] = useState("overview");
	const [dashboard, setDashboard] = useState(null);
	const [branding, setBranding] = useState(null);
	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState(null);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [filters, setFilters] = useState({
		search: "",
		title: "",
		userName: "",
		minRating: "",
		maxRating: "",
		status: "",
	});
	const [appliedFilters, setAppliedFilters] = useState({});
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState("");
	const [editRecord, setEditRecord] = useState(null);
	const [editTitle, setEditTitle] = useState("");
	const [editContent, setEditContent] = useState("");
	const [imageGallery, setImageGallery] = useState(null);

	const title = useMemo(
		() => navigation.find((item) => item.id === activeModule)?.label || "Overview",
		[activeModule]
	);

	useEffect(() => {
		if (!adminApi.hasSession()) {
			navigate("/admin/login", { replace: true });
			return;
		}

		let cancelled = false;
		const loadDashboard = async () => {
			setLoading(true);
			try {
				const result = await adminApi.getDashboard();
				if (!cancelled) setDashboard(result.data);
			} catch (loadError) {
				if (cancelled) return;
				if (!adminApi.hasSession() || loadError.status === 403) {
					adminApi.clearSession();
					navigate("/admin/login", { replace: true });
					return;
				}
				toast.error(loadError.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		loadDashboard();
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	useEffect(() => {
		if (activeModule === "overview" || !adminApi.hasSession()) return undefined;
		let cancelled = false;
		const loadModule = async () => {
			setLoading(true);
			try {
				if (activeModule === "branding") {
					const result = await adminApi.getBranding();
					if (!cancelled) setBranding(result.data);
					return;
				}
				const result = activeModule === "users"
						? await adminApi.getUsers({ page, limit, ...appliedFilters })
						: activeModule === "posts"
							? await adminApi.getPosts({
									page,
									limit,
									title: appliedFilters.title,
									userName: appliedFilters.userName,
									minRating: appliedFilters.minRating,
									maxRating: appliedFilters.maxRating,
									status: appliedFilters.status,
								})
							: await adminApi.getComments({
									page,
									limit,
									status: appliedFilters.status,
								});
				if (!cancelled) {
					setRecords(result.data);
					setPagination(result.pagination);
				}
			} catch (loadError) {
				if (cancelled) return;
				if (!adminApi.hasSession() || loadError.status === 403) {
					adminApi.clearSession();
					navigate("/admin/login", { replace: true });
					return;
				}
				toast.error(loadError.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		loadModule();
		return () => {
			cancelled = true;
		};
	}, [activeModule, appliedFilters, limit, navigate, page]);

	const openModule = (module) => {
		setActiveModule(module);
		setPage(1);
		setRecords([]);
		setPagination(null);
		setAppliedFilters({});
		setFilters({ search: "", title: "", userName: "", minRating: "", maxRating: "", status: "" });
	};

	const reload = async () => {
		try {
			if (activeModule === "overview") {
				const result = await adminApi.getDashboard();
				setDashboard(result.data);
			} else if (activeModule === "branding") {
				const result = await adminApi.getBranding();
				setBranding(result.data);
			} else {
				const params = { ...appliedFilters, page, limit };
				const result =
					activeModule === "users"
						? await adminApi.getUsers(params)
						: activeModule === "posts"
							? await adminApi.getPosts(params)
							: await adminApi.getComments(params);
				setRecords(result.data);
				setPagination(result.pagination);
			}
		} catch (loadError) {
			toast.error(loadError.message);
		}
	};

	const saveBranding = async (formData) => {
		setSavingId("branding");
		try {
			const result = await adminApi.updateBranding(formData);
			setBranding(result.data);
			toast.success("Company branding updated.");
		} catch (saveError) {
			toast.error(saveError.message);
		} finally {
			setSavingId("");
		}
	};

	const performAction = async (id, action, successMessage) => {
		setSavingId(id);
		try {
			await action();
			toast.success(successMessage);
			await reload();
		} catch (actionError) {
			toast.error(actionError.message);
		} finally {
			setSavingId("");
		}
	};

	const applyFilters = (event) => {
		event.preventDefault();
		setPage(1);
		setAppliedFilters({ ...filters });
	};

	const editItem = (record) => {
		setEditRecord(record);
		setEditTitle(record.title || "");
		setEditContent(record.content || "");
	};

	const viewPostImages = async (post) => {
		try {
			const result = await adminApi.getPostImages(post._id);
			if (result.data.length) {
				setImageGallery({ post, images: result.data });
			} else {
				toast.info("This post does not have any images yet.");
			}
		} catch (galleryError) {
			toast.error(galleryError.message);
		}
	};

	const uploadPostImages = async (post, files) => {
		if (files.length > 10) {
			toast.error("You can upload up to 10 images at a time.");
			return;
		}
		await performAction(
			post._id,
			() => adminApi.uploadPostImages(post._id, files),
			`${files.length} ${files.length === 1 ? "image" : "images"} uploaded.`
		);
	};

	const saveEdit = async (event) => {
		event.preventDefault();
		if (!editRecord) return;
		await performAction(
			editRecord._id,
			() => activeModule === "posts"
				? adminApi.updatePost(editRecord._id, { title: editTitle, content: editContent })
				: adminApi.updateComment(editRecord._id, editContent),
			activeModule === "posts" ? "Post updated." : "Comment updated."
		);
		setEditRecord(null);
	};

	const deleteComment = async (comment) => {
		const confirmation = await confirmCommentDeletion();
		if (confirmation.isConfirmed) {
			await performAction(comment._id, () => adminApi.deleteComment(comment._id), "Comment deleted.");
		}
	};

	const signOut = async () => {
		try {
			await adminApi.logout();
		} catch (logoutError) {
			toast.error(logoutError.message);
		} finally {
			navigate("/admin/login", { replace: true });
		}
	};

	if (!adminApi.hasSession()) {
		return <Navigate to="/admin/login" replace />;
	}

	return (
		<div className="admin-shell">
			<AdminSidebar
				activeModule={activeModule}
				onNavigate={openModule}
				onSignOut={signOut}
				branding={branding}
				userCount={dashboard?.totals?.users}
			/>
			<main className="admin-main">
				<AdminHeader admin={admin} branding={branding} title={title} />
				<div className="admin-content">
					<div className="admin-page-heading">
						<div>
							<p className="admin-eyebrow">{activeModule === "overview" ? "YOUR PUBLICATION AT A GLANCE" : activeModule === "branding" ? "SITE CONFIGURATION" : "CONTENT OPERATIONS"}</p>
							<h1>{activeModule === "overview" ? "Good work starts here." : title}</h1>
							<p className="admin-page-subtitle">
								{activeModule === "overview"
									? "A clear view of your community and the stories you’re sharing."
									: activeModule === "branding"
										? "Update the logo, name, and short description used across the site."
										: `Review and manage ${title.toLowerCase()} across your blog.`}
							</p>
						</div>
						<button className="admin-secondary-button" disabled={loading} onClick={reload}>
							<span aria-hidden="true">↻</span> Refresh
						</button>
					</div>

					{activeModule === "overview" && (
						<AdminOverview dashboard={dashboard} loading={loading} onNavigate={openModule} />
					)}
					{activeModule === "branding" && (
						<AdminBrandingSettings
							branding={branding}
							loading={loading}
							onSubmit={saveBranding}
							saving={savingId === "branding"}
						/>
					)}
					{activeModule !== "overview" && activeModule !== "branding" && (
						<section className="admin-panel">
							<AdminModuleFilters
								activeModule={activeModule}
								filters={filters}
								onChange={setFilters}
								onSubmit={applyFilters}
							/>
							{loading ? (
								<div className="admin-empty">Loading {title.toLowerCase()}…</div>
							) : (
								<>
									{activeModule === "users" && (
										<UsersTable
											onToggle={(user) =>
												performAction(
													user._id,
													() => adminApi.setUserStatus(user._id, !user.isActive),
													`User ${user.isActive ? "deactivated" : "activated"}.`
												)
											}
											records={records}
											savingId={savingId}
										/>
									)}
									{activeModule === "posts" && (
										<PostsTable
											onDelete={async (post) => {
												const confirmation = await confirmPostDeletion(post.title);
												if (confirmation.isConfirmed) {
													performAction(post._id, () => adminApi.deletePost(post._id), "Post soft-deleted.");
												}
											}}
											onEdit={editItem}
											onUploadImages={uploadPostImages}
											onToggle={(post) =>
												performAction(
													post._id,
													() => adminApi.setPostStatus(post._id, !post.isActive),
													`Post ${post.isActive ? "hidden" : "published"}.`
												)
											}
											onViewImages={viewPostImages}
											records={records}
											savingId={savingId}
										/>
									)}
									{activeModule === "comments" && (
										<CommentsTable
											onDelete={deleteComment}
											onEdit={editItem}
											onToggle={(comment) =>
												performAction(
													comment._id,
													() => adminApi.setCommentStatus(comment._id, !comment.isActive),
													`Comment ${comment.isActive ? "hidden" : "restored"}.`
												)
											}
											records={records}
											savingId={savingId}
										/>
									)}
									{records.length === 0 && <div className="admin-empty">No {title.toLowerCase()} found for these filters.</div>}
									<AdminPagination
										limit={limit}
										onLimitChange={(nextLimit) => {
											setLimit(nextLimit);
											setPage(1);
										}}
										onPageChange={setPage}
										pagination={pagination}
									/>
								</>
							)}
						</section>
					)}
				</div>
			</main>

			{editRecord && (
				<AdminEditModal
					activeModule={activeModule}
					editContent={editContent}
					editTitle={editTitle}
					onClose={() => setEditRecord(null)}
					onContentChange={setEditContent}
					onSubmit={saveEdit}
					onTitleChange={setEditTitle}
					saving={Boolean(savingId)}
				/>
			)}
			{imageGallery && (
				<AdminImageGallery
					images={imageGallery.images}
					onClose={() => setImageGallery(null)}
					post={imageGallery.post}
				/>
			)}
		</div>
	);
}

export { AdminDashboard };
