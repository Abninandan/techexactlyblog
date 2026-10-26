import { adminApi } from "./adminApi";

const jsonResponse = (status, body) => ({
	ok: status >= 200 && status < 300,
	status,
	json: async () => body,
});

beforeEach(() => {
	sessionStorage.clear();
	adminApi.clearSession();
	global.fetch = jest.fn();
});

test("admin login stores access and refresh tokens for the current browser session", async () => {
	global.fetch.mockResolvedValueOnce(
		jsonResponse(200, {
			data: { accessToken: "access-1", refreshToken: "refresh-1" },
			user: { id: "admin-1", name: "Demo Admin", email: "admin@blog.local" },
		})
	);

	const result = await adminApi.login("admin@blog.local", "Admin123!");

	expect(result.user.name).toBe("Demo Admin");
	expect(sessionStorage.getItem("blogAdminAccessToken")).toBe("access-1");
	expect(sessionStorage.getItem("blogAdminRefreshToken")).toBe("refresh-1");
	expect(adminApi.hasSession()).toBe(true);
});

test("refreshes and retries an expired-access-token request", async () => {
	global.fetch
		.mockResolvedValueOnce(
			jsonResponse(200, {
				data: { accessToken: "access-old", refreshToken: "refresh-old" },
				user: { id: "admin-1", name: "Demo Admin" },
			})
		)
		.mockResolvedValueOnce(jsonResponse(401, { message: "Invalid or expired token" }))
		.mockResolvedValueOnce(
			jsonResponse(200, {
				data: { accessToken: "access-new", refreshToken: "refresh-new" },
			})
		)
		.mockResolvedValueOnce(jsonResponse(200, { data: { totals: { users: 2 } } }));

	await adminApi.login("admin@blog.local", "Admin123!");
	const result = await adminApi.getDashboard();

	expect(result.data.totals.users).toBe(2);
	expect(global.fetch.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer access-old");
	expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toEqual({ refreshToken: "refresh-old" });
	expect(global.fetch.mock.calls[3][1].headers.get("Authorization")).toBe("Bearer access-new");
	expect(sessionStorage.getItem("blogAdminRefreshToken")).toBe("refresh-new");
});

test("clears the browser session after refresh is rejected", async () => {
	global.fetch
		.mockResolvedValueOnce(
			jsonResponse(200, {
				data: { accessToken: "access-old", refreshToken: "refresh-old" },
				user: { id: "admin-1", name: "Demo Admin" },
			})
		)
		.mockResolvedValueOnce(jsonResponse(401, { message: "Invalid access token" }))
		.mockResolvedValueOnce(jsonResponse(401, { message: "Invalid refresh token" }));

	await adminApi.login("admin@blog.local", "Admin123!");
	await expect(adminApi.getDashboard()).rejects.toThrow("Invalid refresh token");

	expect(adminApi.hasSession()).toBe(false);
	expect(sessionStorage.getItem("blogAdminAccessToken")).toBeNull();
	expect(sessionStorage.getItem("blogAdminRefreshToken")).toBeNull();
});

test("revokes the refresh token and clears browser credentials on logout", async () => {
	global.fetch
		.mockResolvedValueOnce(
			jsonResponse(200, {
				data: { accessToken: "access-1", refreshToken: "refresh-1" },
				user: { id: "admin-1", name: "Demo Admin" },
			})
		)
		.mockResolvedValueOnce(jsonResponse(200, { message: "Logged out successfully" }));

	await adminApi.login("admin@blog.local", "Admin123!");
	await adminApi.logout();

	expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ refreshToken: "refresh-1" });
	expect(adminApi.hasSession()).toBe(false);
});

test("passes the selected page size and page to the users API", async () => {
	global.fetch.mockResolvedValueOnce(jsonResponse(200, {
		data: [],
		pagination: { page: 2, limit: 20, total: 21, pages: 2 },
	}));

	await adminApi.getUsers({ page: 2, limit: 20, search: "Riley" });

	expect(global.fetch.mock.calls[0][0]).toBe(
		"http://localhost:5000/api/admin/users?page=2&limit=20&search=Riley"
	);
});

test("uploads multiple images as multipart form data without overriding its content type", async () => {
	global.fetch.mockResolvedValueOnce(jsonResponse(201, { data: [] }));
	const images = [
		new File(["first"], "first.png", { type: "image/png" }),
		new File(["second"], "second.jpg", { type: "image/jpeg" }),
	];

	await adminApi.uploadPostImages("post-1", images);

	const [url, options] = global.fetch.mock.calls[0];
	expect(url).toBe("http://localhost:5000/api/admin/posts/post-1/images");
	expect(options.method).toBe("POST");
	expect(options.headers.has("Content-Type")).toBe(false);
	expect(options.body.getAll("images")).toEqual(images);
});
