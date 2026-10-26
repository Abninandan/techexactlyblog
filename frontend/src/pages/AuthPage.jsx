import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { userApi } from "../services/userApi";
import { useUserAuth } from "../Context/UserAuthContext";

const AuthPage = ({ mode }) => {
	const { token } = useParams();
	const navigate = useNavigate();
	const { signIn, register } = useUserAuth();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (event) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email") || "").trim();
		const password = String(form.get("password") || "");
		setBusy(true);
		setError("");
		try {
			if (mode === "login") {
				await signIn(email, password);
				toast.success("Welcome back");
				navigate("/");
			} else if (mode === "register") {
				await register(String(form.get("name") || "").trim(), email, password);
				toast.success("Your account is ready");
				navigate("/");
			} else if (mode === "forgot") {
				const result = await userApi.forgotPassword(email);
				toast.success(result.message);
			} else {
				const result = await userApi.resetPassword(token, password);
				toast.success(result.message);
				navigate("/login");
			}
		} catch (requestError) {
			setError(requestError.message);
			toast.error(requestError.message);
		} finally {
			setBusy(false);
		}
	};

	const content = {
		login: { eyebrow: "Welcome back", title: "Log in", description: "Pick up where you left off.", button: "Log in" },
		register: { eyebrow: "Join the conversation", title: "Create your account", description: "A place for your ideas and the people who share them.", button: "Create account" },
		forgot: { eyebrow: "Account recovery", title: "Forgot your password?", description: "Enter your account email and we’ll send a reset link if it exists.", button: "Send reset link" },
		reset: { eyebrow: "Account recovery", title: "Choose a new password", description: "Use at least 8 characters for your new password.", button: "Update password" },
	}[mode];

	return (
		<section className="auth-panel">
			<div className="auth-intro">
				<p className="eyebrow">{content.eyebrow}</p>
				<h1>{content.title}</h1>
				<p>{content.description}</p>
			</div>
			<form className="blog-form" onSubmit={handleSubmit}>
				{mode === "register" && <label>Your name<input name="name" autoComplete="name" maxLength="100" required /></label>}
				{mode !== "reset" && <label>Email address<input name="email" type="email" autoComplete="email" required /></label>}
				{(mode === "login" || mode === "register" || mode === "reset") && (
					<label>{mode === "reset" ? "New password" : "Password"}
						<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength="8" maxLength="128" required />
					</label>
				)}
				{error && <p className="form-error" role="alert">{error}</p>}
				<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : content.button}</button>
			</form>
			{mode === "login" && <p className="auth-alt"><Link to="/forgot-password">Forgot password?</Link><span>New here? <Link to="/register">Create an account</Link></span></p>}
			{mode === "register" && <p className="auth-alt">Already a member? <Link to="/login">Log in</Link></p>}
			{mode === "forgot" && <p className="auth-alt"><Link to="/login">Back to log in</Link></p>}
		</section>
	);
};

export default AuthPage;
