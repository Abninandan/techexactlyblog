import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AdminDashboard, AdminLogin } from "./Admin";
import { adminApi } from "../services/adminApi";
import { confirmCommentDeletion, confirmPostDeletion } from "./Admin/utils/swal";

jest.mock("../services/adminApi", () => ({
	adminApi: {
		login: jest.fn(),
		logout: jest.fn(),
		hasSession: jest.fn(),
		getStoredUser: jest.fn(),
		clearSession: jest.fn(),
		getDashboard: jest.fn(),
		getUsers: jest.fn(),
		setUserStatus: jest.fn(),
		getPosts: jest.fn(),
		updatePost: jest.fn(),
		setPostStatus: jest.fn(),
		deletePost: jest.fn(),
		getComments: jest.fn(),
		updateComment: jest.fn(),
		deleteComment: jest.fn(),
		setCommentStatus: jest.fn(),
		getPostImages: jest.fn(),
		uploadPostImages: jest.fn(),
		getMediaUrl: jest.fn((url) => `http://localhost:5000${url}`),
	},
}));

jest.mock("./Admin/utils/swal", () => ({
	confirmPostDeletion: jest.fn(),
	confirmCommentDeletion: jest.fn(),
}));

const page = (data = []) => ({
	data,
	pagination: { page: 1, limit: 10, total: data.length, pages: 1 },
});

const renderDashboard = () =>
	render(
		<MemoryRouter initialEntries={["/admin"]}>
			<ToastContainer />
			<Routes>
				<Route element={<AdminDashboard />} path="/admin" />
				<Route element={<h1>Admin sign in</h1>} path="/admin/login" />
			</Routes>
		</MemoryRouter>
	);

beforeEach(() => {
	jest.clearAllMocks();
	adminApi.hasSession.mockReturnValue(true);
	adminApi.getStoredUser.mockReturnValue({ name: "Demo Admin", email: "admin@blog.local" });
	adminApi.getDashboard.mockResolvedValue({
		data: { totals: { users: 4, posts: 7, comments: 12 } },
	});
	adminApi.getUsers.mockResolvedValue(page([]));
	adminApi.setUserStatus.mockResolvedValue({});
	adminApi.getPosts.mockResolvedValue(page([]));
	adminApi.updatePost.mockResolvedValue({});
	adminApi.setPostStatus.mockResolvedValue({});
	adminApi.deletePost.mockResolvedValue({});
	adminApi.getComments.mockResolvedValue(page([]));
	adminApi.updateComment.mockResolvedValue({});
	adminApi.deleteComment.mockResolvedValue({});
	adminApi.setCommentStatus.mockResolvedValue({});
	adminApi.getPostImages.mockResolvedValue({ data: [] });
	adminApi.uploadPostImages.mockResolvedValue({});
	adminApi.logout.mockResolvedValue({});
	confirmPostDeletion.mockResolvedValue({ isConfirmed: true });
	confirmCommentDeletion.mockResolvedValue({ isConfirmed: true });
});

test("renders dashboard totals and loads admin modules through their APIs", async () => {
	renderDashboard();

	expect(await screen.findByText("Good work starts here.")).toBeInTheDocument();
	expect(await within(screen.getByText("Registered readers").closest("article")).findByText("4")).toBeInTheDocument();
	expect(await within(screen.getByText("Published stories").closest("article")).findByText("7")).toBeInTheDocument();
	expect(await within(screen.getByText("Reader comments").closest("article")).findByText("12")).toBeInTheDocument();

	const navigation = screen.getByRole("navigation", { name: "Admin sections" });
	await userEvent.click(within(navigation).getByRole("button", { name: /Users/ }));
	await waitFor(() => expect(adminApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 })));
	await userEvent.click(within(navigation).getByRole("button", { name: /Posts/ }));
	await waitFor(() => expect(adminApi.getPosts).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 })));
	await userEvent.click(within(navigation).getByRole("button", { name: /Comments/ }));
	await waitFor(() => expect(adminApi.getComments).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 })));
});

test("searches posts by title, author, and rating filters", async () => {
	renderDashboard();
	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Posts/ }));
	await screen.findByText("No posts found for these filters.");

	await userEvent.type(screen.getByPlaceholderText("Search title"), "MERN guide");
	await userEvent.type(screen.getByPlaceholderText("Search author"), "Riley");
	fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "4" } });
	fireEvent.change(screen.getByLabelText("Maximum rating"), { target: { value: "5" } });
	await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

	await waitFor(() =>
		expect(adminApi.getPosts).toHaveBeenLastCalledWith({
			page: 1,
			limit: 10,
			title: "MERN guide",
			userName: "Riley",
			minRating: "4",
			maxRating: "5",
			status: "",
		})
	);
});

test("changes the page size and requests the selected limit from the API", async () => {
	renderDashboard();
	const navigation = within(screen.getByRole("navigation", { name: "Admin sections" }));
	await userEvent.click(navigation.getByRole("button", { name: /Users/ }));
	await screen.findByLabelText("Rows per page");
	fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "20" } });
	await waitFor(() =>
		expect(adminApi.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 }))
	);

	await userEvent.click(navigation.getByRole("button", { name: /Posts/ }));
	fireEvent.change(await screen.findByLabelText("Rows per page"), { target: { value: "100" } });
	await waitFor(() =>
		expect(adminApi.getPosts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 100 }))
	);

	await userEvent.click(navigation.getByRole("button", { name: /Comments/ }));
	fireEvent.change(await screen.findByLabelText("Rows per page"), { target: { value: "10" } });
	await waitFor(() =>
		expect(adminApi.getComments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 10 }))
	);
});

test("requests the next page from the backend when pagination advances", async () => {
	adminApi.getUsers.mockResolvedValue({
		data: [],
		pagination: { page: 1, limit: 10, total: 15, pages: 2 },
	});
	renderDashboard();
	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Users/ }));
	await screen.findByText("Page 1 of 2 · 15 records");
	adminApi.getUsers.mockResolvedValue({
		data: [],
		pagination: { page: 2, limit: 10, total: 15, pages: 2 },
	});
	await userEvent.click(screen.getByRole("button", { name: "Next" }));

	await waitFor(() =>
		expect(adminApi.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 10 }))
	);
	expect(await screen.findByText("Page 2 of 2 · 15 records")).toBeInTheDocument();
});

test("toggles a regular user's active status", async () => {
	adminApi.getUsers
		.mockResolvedValueOnce(page([{ _id: "user-1", name: "Riley Reader", email: "riley@example.test", isActive: true }]))
		.mockResolvedValue(page([{ _id: "user-1", name: "Riley Reader", email: "riley@example.test", isActive: false }]));
	renderDashboard();

	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Users/ }));
	const deactivate = await screen.findByRole("button", { name: "Deactivate" });
	await userEvent.click(deactivate);

	await waitFor(() => expect(adminApi.setUserStatus).toHaveBeenCalledWith("user-1", false));
	expect(await screen.findByText("User deactivated.")).toBeInTheDocument();
});

test("edits, hides, and soft-deletes a post", async () => {
	const post = { _id: "post-1", title: "First story", content: "Original story content", slug: "first-story", isActive: true, averageRating: 4.5, ratingCount: 2, author: { name: "Riley" } };
	adminApi.getPosts.mockResolvedValue(page([post]));
	renderDashboard();
	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Posts/ }));

	await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
	await userEvent.clear(screen.getByLabelText("Title"));
	await userEvent.type(screen.getByLabelText("Title"), "Revised story");
	await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
	await waitFor(() => expect(adminApi.updatePost).toHaveBeenCalledWith("post-1", { title: "Revised story", content: "Original story content" }));
	expect(await screen.findByText("Post updated.")).toBeInTheDocument();

	await userEvent.click(screen.getByRole("button", { name: "Hide" }));
	await waitFor(() => expect(adminApi.setPostStatus).toHaveBeenCalledWith("post-1", false));
	expect(await screen.findByText("Post hidden.")).toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Delete" }));
	await waitFor(() => expect(confirmPostDeletion).toHaveBeenCalledWith("First story"));
	await waitFor(() => expect(adminApi.deletePost).toHaveBeenCalledWith("post-1"));
});

test("uploads multiple post images and opens them in the image gallery", async () => {
	const post = {
		_id: "post-1",
		title: "First story",
		content: "Story content",
		slug: "first-story",
		isActive: true,
		imageCount: 2,
		coverImage: { url: "/uploads/first.png" },
		author: { name: "Riley" },
	};
	const images = [
		{ _id: "image-1", url: "/uploads/first.png", originalName: "first.png" },
		{ _id: "image-2", url: "/uploads/second.png", originalName: "second.png" },
	];
	adminApi.getPosts.mockResolvedValue(page([post]));
	adminApi.getPostImages.mockResolvedValue({ data: images });
	renderDashboard();
	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Posts/ }));

	await userEvent.click(await screen.findByRole("button", { name: "View 2 images for First story" }));
	expect(await screen.findByRole("dialog", { name: "First story" })).toBeInTheDocument();
	expect(screen.getByRole("img", { name: "first.png" })).toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Show second.png" }));
	expect(screen.getByRole("img", { name: "second.png" })).toBeInTheDocument();

	await userEvent.click(screen.getByRole("button", { name: "Close image gallery" }));
	const firstFile = new File(["first"], "first.png", { type: "image/png" });
	const secondFile = new File(["second"], "second.png", { type: "image/png" });
	fireEvent.change(screen.getByLabelText("Select images for First story"), {
		target: { files: [firstFile, secondFile] },
	});

	await waitFor(() =>
		expect(adminApi.uploadPostImages).toHaveBeenCalledWith("post-1", [firstFile, secondFile])
	);
	expect(await screen.findByText("2 images uploaded.")).toBeInTheDocument();
});

test("admin can edit and delete any comment", async () => {
	adminApi.getComments.mockResolvedValue(page([{
		_id: "comment-1",
		content: "A helpful comment",
		isActive: true,
		createdAt: "2026-10-01T00:00:00.000Z",
		author: { name: "Riley" },
		post: { title: "First story" },
	}]));
	renderDashboard();
	await userEvent.click(within(screen.getByRole("navigation", { name: "Admin sections" })).getByRole("button", { name: /Comments/ }));

	expect(await screen.findByText("A helpful comment")).toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Edit" }));
	await userEvent.clear(screen.getByLabelText("Comment"));
	await userEvent.type(screen.getByLabelText("Comment"), "Admin-reviewed comment");
	await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
	await waitFor(() => expect(adminApi.updateComment).toHaveBeenCalledWith("comment-1", "Admin-reviewed comment"));

	await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled());
	await userEvent.click(screen.getByRole("button", { name: "Delete" }));
	await waitFor(() => expect(adminApi.deleteComment).toHaveBeenCalledWith("comment-1"));
	expect(await screen.findByText("Comment deleted.")).toBeInTheDocument();
});

test("signs in through the admin API and routes to the dashboard", async () => {
	adminApi.hasSession.mockReturnValue(false);
	adminApi.login.mockResolvedValue({ user: { name: "Demo Admin" } });
	render(
		<MemoryRouter initialEntries={["/admin/login"]}>
			<ToastContainer />
			<Routes>
				<Route element={<AdminLogin />} path="/admin/login" />
				<Route element={<h1>Dashboard route</h1>} path="/admin" />
			</Routes>
		</MemoryRouter>
	);

	await userEvent.type(screen.getByLabelText("Email address"), "admin@blog.local");
	await userEvent.type(screen.getByLabelText("Password"), "Admin123!");
	await userEvent.click(screen.getByRole("button", { name: "Sign in to dashboard" }));

	expect(await screen.findByText("Dashboard route")).toBeInTheDocument();
	expect(adminApi.login).toHaveBeenCalledWith("admin@blog.local", "Admin123!");
});
