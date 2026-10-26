const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const ACCESS_TOKEN_KEY = "blogAdminAccessToken";
const REFRESH_TOKEN_KEY = "blogAdminRefreshToken";
const ADMIN_USER_KEY = "blogAdminUser";

let accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
let refreshRequest;

const saveSession = ({ accessToken: nextAccessToken, refreshToken: nextRefreshToken }, user) => {
	accessToken = nextAccessToken;
	refreshToken = nextRefreshToken;
	sessionStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
	sessionStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
	if (user) {
		sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
	}
};

const clearSession = () => {
	accessToken = null;
	refreshToken = null;
	sessionStorage.removeItem(ACCESS_TOKEN_KEY);
	sessionStorage.removeItem(REFRESH_TOKEN_KEY);
	sessionStorage.removeItem(ADMIN_USER_KEY);
};

const readResponse = async (response) => {
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(
			payload.message || payload.error?.message || `Request failed (${response.status})`
		);
		error.status = response.status;
		throw error;
	}
	return payload;
};

const refreshSession = async () => {
	if (!refreshToken) {
		clearSession();
		throw new Error("Your session has expired. Please sign in again.");
	}

	if (!refreshRequest) {
		refreshRequest = fetch(`${API_BASE_URL}/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		})
			.then(readResponse)
			.then(({ data }) => {
				saveSession(data);
				return data.accessToken;
			})
			.catch((error) => {
				clearSession();
				throw error;
			})
			.finally(() => {
				refreshRequest = null;
			});
	}

	return refreshRequest;
};

const request = async (path, options = {}, shouldRetry = true) => {
	const headers = new Headers(options.headers || {});
	if (accessToken) {
		headers.set("Authorization", `Bearer ${accessToken}`);
	}
	const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
	if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
	if (response.status === 401 && shouldRetry) {
		if (refreshToken) {
			await refreshSession();
			return request(path, options, false);
		}
		clearSession();
	}
	return readResponse(response);
};

const login = async (email, password) => {
	const payload = await request(
		"/admin/login",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		},
		false
	);

	saveSession(payload.data, payload.user);
	return payload;
};

const logout = async () => {
	try {
		if (refreshToken) {
			await request(
				"/auth/logout",
				{
					method: "POST",
					body: JSON.stringify({ refreshToken }),
				},
				false
			);
		}
	} finally {
		clearSession();
	}
};

const getStoredUser = () => {
	try {
		return JSON.parse(sessionStorage.getItem(ADMIN_USER_KEY) || "null");
	} catch {
		return null;
	}
};

const queryString = (params) => {
	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && String(value).trim() !== "") {
			searchParams.set(key, value);
		}
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

export const adminApi = {
	login,
	logout,
	refreshSession,
	hasSession: () => Boolean(accessToken || refreshToken),
	clearSession,
	getStoredUser,
	getDashboard: () => request("/admin/dashboard"),
	getBranding: () => request("/admin/branding"),
	updateBranding: (formData) => request("/admin/branding", { method: "PUT", body: formData }),
	getUsers: (params) => request(`/admin/users${queryString(params)}`),
	setUserStatus: (userId, isActive) =>
		request(`/admin/users/${userId}/status`, {
			method: "PATCH",
			body: JSON.stringify({ isActive }),
		}),
	getPosts: (params) => request(`/admin/posts${queryString(params)}`),
	getPostImages: (postId) => request(`/admin/posts/${postId}/images`),
	uploadPostImages: (postId, files) => {
		const body = new FormData();
		files.forEach((file) => body.append("images", file));
		return request(`/admin/posts/${postId}/images`, { method: "POST", body });
	},
	getMediaUrl: (url) => {
		if (/^https?:\/\//i.test(url)) return url;
		const serverUrl = API_BASE_URL.replace(/\/api\/?$/, "");
		return `${serverUrl}${url.startsWith("/") ? url : `/${url}`}`;
	},
	updatePost: (postId, updates) =>
		request(`/admin/posts/${postId}`, {
			method: "PATCH",
			body: JSON.stringify(updates),
		}),
	setPostStatus: (postId, isActive) =>
		request(`/admin/posts/${postId}/status`, {
			method: "PATCH",
			body: JSON.stringify({ isActive }),
		}),
	deletePost: (postId) =>
		request(`/admin/posts/${postId}`, { method: "DELETE" }),
	getComments: (params) => request(`/admin/comments${queryString(params)}`),
	updateComment: (commentId, content) =>
		request(`/admin/comments/${commentId}`, {
			method: "PATCH",
			body: JSON.stringify({ content }),
		}),
	deleteComment: (commentId) =>
		request(`/admin/comments/${commentId}`, { method: "DELETE" }),
	setCommentStatus: (commentId, isActive) =>
		request(`/admin/comments/${commentId}/status`, {
			method: "PATCH",
			body: JSON.stringify({ isActive }),
		}),
};
