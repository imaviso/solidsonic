import { createStore } from "solid-js/store";

export interface LegacySubsonicCredentials {
	authType: "legacy";
	serverUrl: string;
	username: string;
	password: string;
}

export interface ApiKeySubsonicCredentials {
	authType: "apiKey";
	serverUrl: string;
	apiKey: string;
	username?: string;
}

export type SubsonicCredentials =
	| LegacySubsonicCredentials
	| ApiKeySubsonicCredentials;

interface AuthState {
	credentials: SubsonicCredentials | null;
	isAuthenticated: boolean;
	isLoaded: boolean;
}

const AUTH_STORAGE_KEY = "solidsonic-auth-session";
const LEGACY_AUTH_STORAGE_KEY = "solidsonic-auth";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseStoredCredentials(value: unknown): SubsonicCredentials | null {
	if (!isObject(value) || typeof value.serverUrl !== "string") {
		return null;
	}

	const serverUrl = value.serverUrl.replace(/\/+$/, "");

	if (
		value.authType === "apiKey" &&
		typeof value.apiKey === "string" &&
		value.apiKey.trim().length > 0
	) {
		return {
			authType: "apiKey",
			serverUrl,
			apiKey: value.apiKey.trim(),
			username:
				typeof value.username === "string" && value.username.trim().length > 0
					? value.username.trim()
					: undefined,
		};
	}

	if (
		value.authType === "legacy" &&
		typeof value.username === "string" &&
		typeof value.password === "string" &&
		value.username.trim().length > 0
	) {
		return {
			authType: "legacy",
			serverUrl,
			username: value.username.trim(),
			password: value.password,
		};
	}

	if (
		typeof value.username === "string" &&
		typeof value.password === "string" &&
		value.username.trim().length > 0
	) {
		return {
			authType: "legacy",
			serverUrl,
			username: value.username.trim(),
			password: value.password,
		};
	}

	return null;
}

// Create a Solid Store
const [authState, setAuthState] = createStore<AuthState>({
	credentials: null,
	isAuthenticated: false,
	isLoaded: false,
});

let authLoadPromise: Promise<void> | null = null;

// Load credentials asynchronously from session storage
async function loadCredentials() {
	let credentials = null;

	try {
		const sessionStored = sessionStorage.getItem(AUTH_STORAGE_KEY);
		if (sessionStored) {
			credentials = parseStoredCredentials(JSON.parse(sessionStored));
		} else {
			const legacyStored = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
			if (legacyStored) {
				credentials = parseStoredCredentials(JSON.parse(legacyStored));
				if (credentials) {
					sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
				}
				localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
			}
		}
	} catch {
		// Invalid stored data
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
	const normalizedServerUrl = credentials.serverUrl.replace(/\/+$/, "");
	const normalizedCredentials: SubsonicCredentials =
		credentials.authType === "apiKey"
			? {
					authType: "apiKey",
					serverUrl: normalizedServerUrl,
					apiKey: credentials.apiKey.trim(),
					username: credentials.username?.trim() || undefined,
				}
			: {
					authType: "legacy",
					serverUrl: normalizedServerUrl,
					username: credentials.username.trim(),
					password: credentials.password,
				};

	sessionStorage.setItem(
		AUTH_STORAGE_KEY,
		JSON.stringify(normalizedCredentials),
	);

	// Update store
	setAuthState({
		credentials: normalizedCredentials,
		isAuthenticated: true,
	});
}

export function logout() {
	sessionStorage.removeItem(AUTH_STORAGE_KEY);
	localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);

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
