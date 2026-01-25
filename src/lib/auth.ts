import { createStore } from "solid-js/store";

export interface SubsonicCredentials {
	serverUrl: string;
	username: string;
	password: string;
}

interface AuthState {
	credentials: SubsonicCredentials | null;
	isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = "solidsonic-auth";

function getStoredCredentials(): SubsonicCredentials | null {
	try {
		const stored = localStorage.getItem(AUTH_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Invalid stored data
	}
	return null;
}

// Create a Solid Store instead of a plain object + listeners
const [authState, setAuthState] = createStore<AuthState>({
	credentials: getStoredCredentials(),
	isAuthenticated: getStoredCredentials() !== null,
});

export function login(credentials: SubsonicCredentials) {
	// Normalize server URL (remove trailing slash)
	const normalizedCredentials = {
		...credentials,
		serverUrl: credentials.serverUrl.replace(/\/+$/, ""),
	};

	localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedCredentials));

	// Update store
	setAuthState({
		credentials: normalizedCredentials,
		isAuthenticated: true,
	});
}

export function logout() {
	localStorage.removeItem(AUTH_STORAGE_KEY);

	// Update store
	setAuthState({
		credentials: null,
		isAuthenticated: false,
	});
}

export function getCredentials(): SubsonicCredentials | null {
	return authState.credentials;
}

export function isAuthenticated(): boolean {
	return authState.isAuthenticated;
}

// In Solid, we don't strictly need a hook wrapper, but it keeps API compatible
export function useAuth() {
	return {
		// Use getters to maintain reactivity when destructured/accessed
		get credentials() {
			return authState.credentials;
		},
		get isAuthenticated() {
			return authState.isAuthenticated;
		},
		login,
		logout,
	};
}
