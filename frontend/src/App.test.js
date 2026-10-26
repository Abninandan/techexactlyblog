import { render, screen } from "@testing-library/react";
import App from "./App";
import { ThemeProvider } from "./Context/ThemeContext";
import { userApi } from "./services/userApi";

test("renders the home feed", async () => {
	jest.spyOn(userApi, "getAuthors").mockResolvedValue({ data: [] });
	jest.spyOn(userApi, "getBranding").mockResolvedValue({
		data: {
			companyName: "Example Press",
			shortDescription: "Independent ideas, shared.",
			logoUrl: "",
		},
	});
	jest.spyOn(userApi, "getPosts").mockResolvedValue({
		data: [{
			_id: "post-1",
			title: "A welcome story",
			content: "A story for the community.",
			slug: "welcome-story",
			author: { _id: "author-1", name: "Avery" },
			createdAt: "2026-01-01T00:00:00.000Z",
			imageCount: 0,
		}],
		pagination: { page: 1, pages: 1, total: 1, limit: 10 },
	});
	render(
		<ThemeProvider>
			<App />
		</ThemeProvider>
	);

	expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
	expect(await screen.findByRole("heading", { name: "A welcome story" })).toBeInTheDocument();
	expect(screen.getByRole("link", { name: /Example Press home/ })).toBeInTheDocument();
	expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
});
