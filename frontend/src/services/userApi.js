const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const ACCESS_TOKEN_KEY = "blogUserAccessToken";
const REFRESH_TOKEN_KEY = "blogUserRefreshToken";
const USER_KEY = "blogUser";

let accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
let refreshRequest;

const clearSession = () => {
	accessToken = null;
	refreshToken = null;
	sessionStorage.removeItem(ACCESS_TOKEN_KEY);
	sessionStorage.removeItem(REFRESH_TOKEN_KEY);
	sessionStorage.removeItem(USER_KEY);
};

const saveSession = (tokens, user) => {
	accessToken = tokens.accessToken;
	refreshToken = tokens.refreshToken;
	sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
	sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

const readResponse = async (response) => {
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(payload.message || payload.error?.message || `Request failed (${response.status})`);
		error.status = response.status;
		throw error;
	}
	return payload;
};

const refreshSession = async () => {
	if (!refreshToken) throw new Error("Your session has expired. Please sign in again.");
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

const request = async (path, options = {}, retry = true) => {
	const headers = new Headers(options.headers || {});
	if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
	const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
	if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
	if (response.status === 401 && retry && refreshToken) {
		await refreshSession();
		return request(path, options, false);
	}
	if (response.status === 401) clearSession();
	return readResponse(response);
};

const queryString = (values) => {
	const query = new URLSearchParams();
	Object.entries(values).forEach(([key, value]) => {
		if (value !== undefined && value !== null && String(value).trim()) query.set(key, value);
	});
	const result = query.toString();
	return result ? `?${result}` : "";
};

const authenticate = async (endpoint, credentials) => {
	const payload = await request(`/auth/${endpoint}`, {
		method: "POST",
		body: JSON.stringify(credentials),
	}, false);
	saveSession(payload.data, payload.user);
	return payload;
};

export const userApi = {
	login: (email, password) => authenticate("login", { email, password }),
	register: (name, email, password) => authenticate("register", { name, email, password }),
	forgotPassword: (email) => request("/auth/forgot-password", {
		method: "POST",
		body: JSON.stringify({ email }),
	}, false),
	resetPassword: (token, password) => request("/auth/reset-password", {
		method: "POST",
		body: JSON.stringify({ token, password }),
	}, false),
	logout: async () => {
		try {
			if (refreshToken) {
				await request("/auth/logout", {
					method: "POST",
					body: JSON.stringify({ refreshToken }),
				}, false);
			}
		} finally {
			clearSession();
		}
	},
	refreshSession,
	getStoredUser: () => {
		try {
			return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
		} catch {
			return null;
		}
	},
	hasSession: () => Boolean(accessToken || refreshToken),
	clearSession,
	getPosts: (params = {}) => request(`/posts${queryString(params)}`),
	getBranding: () => request("/branding"),
	getPost: (slug) => request(`/posts/${encodeURIComponent(slug)}`),
	getAuthors: () => request("/posts/authors"),
	getAuthor: (authorId, params = {}) => request(`/posts/authors/${authorId}${queryString(params)}`),
	createPost: (formData) => request("/posts", { method: "POST", body: formData }),
	updatePost: (postId, changes) => request(`/posts/${postId}`, {
		method: "PATCH",
		body: JSON.stringify(changes),
	}),
	deletePost: (postId) => request(`/posts/${postId}`, { method: "DELETE" }),
	createComment: (postId, content) => request(`/posts/${postId}/comments`, {
		method: "POST",
		body: JSON.stringify({ content }),
	}),
	updateComment: (commentId, content) => request(`/posts/comments/${commentId}`, {
		method: "PATCH",
		body: JSON.stringify({ content }),
	}),
	deleteComment: (commentId) => request(`/posts/comments/${commentId}`, { method: "DELETE" }),
	getMediaUrl: (url) => {
		if (/^https?:\/\//i.test(url)) return url;
		const serverUrl = API_BASE_URL.replace(/\/api\/?$/, "");
		return `${serverUrl}${url.startsWith("/") ? url : `/${url}`}`;
	},
};
