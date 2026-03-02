import { createStore } from "solid-js/store";

// ============================================================================
// Types
// ============================================================================

export type Theme = "light" | "dark" | "system";

export interface Settings {
	dynamicPlayerBackground: boolean; // Enable dynamic background based on album art
	theme: Theme;
	maxBitRate: number; // 0 = unlimited
	scrobblingEnabled: boolean;
}

// ============================================================================
// Storage
// ============================================================================

const SETTINGS_STORAGE_KEY = "solidsonic-settings";

const defaultSettings: Settings = {
	dynamicPlayerBackground: false,
	theme: "system",
	maxBitRate: 0,
	scrobblingEnabled: true,
};

function loadSettings(): Settings {
	try {
		const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultSettings, ...parsed };
		}
	} catch {
		// Invalid stored data, return defaults
	}
	return { ...defaultSettings };
}

function saveSettings(settings: Settings): void {
	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch (err) {
		console.warn("Failed to save settings to localStorage:", err);
	}
}

// ============================================================================
// State Management
// ============================================================================

const [settings, setSettings] = createStore<Settings>(loadSettings());

// ============================================================================
// Public API
// ============================================================================

export function getSettings(): Settings {
	return settings;
}

export function updateSettings(updates: Partial<Settings>): void {
	setSettings(updates);
	saveSettings(settings);
}

export function setDynamicPlayerBackground(enabled: boolean): void {
	updateSettings({ dynamicPlayerBackground: enabled });
}

export function setTheme(theme: Theme): void {
	updateSettings({ theme });
	applyTheme(theme);
}

export function setMaxBitRate(bitRate: number): void {
	updateSettings({ maxBitRate: bitRate });
}

export function setScrobblingEnabled(enabled: boolean): void {
	updateSettings({ scrobblingEnabled: enabled });
}

function applyTheme(theme: Theme) {
	if (typeof window === "undefined") return;

	const root = document.documentElement;
	const isDark =
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	if (isDark) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

// Initialize theme
if (typeof window !== "undefined") {
	const settings = loadSettings();
	applyTheme(settings.theme);

	// Listen for system changes
	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", () => {
			if (getSettings().theme === "system") {
				applyTheme("system");
			}
		});
}

// ============================================================================
// Hook
// ============================================================================

export function useSettings() {
	return {
		settings,
		updateSettings,
		setDynamicPlayerBackground,
		setTheme,
		setMaxBitRate,
		setScrobblingEnabled,
	};
}
