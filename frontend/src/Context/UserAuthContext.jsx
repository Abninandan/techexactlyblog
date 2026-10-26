import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { userApi } from "../services/userApi";

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
	const [user, setUser] = useState(() => userApi.getStoredUser());
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let active = true;
		const restoreSession = async () => {
			if (userApi.hasSession()) {
				try {
					await userApi.refreshSession();
				} catch {
					userApi.clearSession();
					if (active) setUser(null);
				}
			} else {
				userApi.clearSession();
				if (active) setUser(null);
			}
			if (active) setReady(true);
		};
		restoreSession();
		return () => {
			active = false;
		};
	}, []);

	const value = useMemo(() => ({
		user,
		ready,
		signIn: async (email, password) => {
			const result = await userApi.login(email, password);
			setUser(result.user);
			return result;
		},
		register: async (name, email, password) => {
			const result = await userApi.register(name, email, password);
			setUser(result.user);
			return result;
		},
		signOut: async () => {
			await userApi.logout();
			setUser(null);
		},
	}), [user, ready]);

	return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

export const useUserAuth = () => {
	const context = useContext(UserAuthContext);
	if (!context) throw new Error("useUserAuth must be used within UserAuthProvider");
	return context;
};
