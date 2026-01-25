import { createStore } from "solid-js/store";

export interface SubsonicCredentials {
	serverUrl: string;
	username: string;
	password: string;
}

interface AuthState {
	credentials: SubsonicCredentials | null;
	isAuthenticated: boolean;
	isLoaded: boolean;
}

const AUTH_STORAGE_KEY = "solidsonic-auth";

// Create a Solid Store
const [authState, setAuthState] = createStore<AuthState>({
	credentials: null,
	isAuthenticated: false,
	isLoaded: false,
});

let authLoadPromise: Promise<void> | null = null;

// Load credentials asynchronously from secure storage
async function loadCredentials() {
	let credentials = null;

	// Try secure storage first
	if (window.electronAPI?.auth) {
		credentials = await window.electronAPI.auth.get();
	}

	// Fallback/Migration from localStorage
	if (!credentials) {
		try {
			const stored = localStorage.getItem(AUTH_STORAGE_KEY);
			if (stored) {
				credentials = JSON.parse(stored);
				// If we have electronAPI, migrate it
				if (window.electronAPI?.auth && credentials) {
					await window.electronAPI.auth.save(credentials);
					localStorage.removeItem(AUTH_STORAGE_KEY);
				}
			}
		} catch {
			// Invalid stored data
		}
	}

	if (credentials) {
		setAuthState({
			credentials,
			isAuthenticated: true,
			isLoaded: true,
		});
	} else {
		setAuthState("isLoaded", true);
	}
}

export function ensureAuthLoaded() {
	if (!authLoadPromise) {
		authLoadPromise = loadCredentials();
	}
	return authLoadPromise;
}

// Initial load trigger
ensureAuthLoaded();

export function isAuthLoaded() {
	return authState.isLoaded;
}

export function login(credentials: SubsonicCredentials) {
	// Normalize server URL (remove trailing slash)
	const normalizedCredentials = {
		...credentials,
		serverUrl: credentials.serverUrl.replace(/\/+$/, ""),
	};

	if (window.electronAPI?.auth) {
		window.electronAPI.auth.save(normalizedCredentials);
	} else {
		localStorage.setItem(
			AUTH_STORAGE_KEY,
			JSON.stringify(normalizedCredentials),
		);
	}

	// Update store
	setAuthState({
		credentials: normalizedCredentials,
		isAuthenticated: true,
	});
}

export function logout() {
	if (window.electronAPI?.auth) {
		window.electronAPI.auth.clear();
	} else {
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}

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
