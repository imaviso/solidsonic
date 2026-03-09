import {
	blueFromArgb,
	greenFromArgb,
	Hct,
	redFromArgb,
	SchemeContent,
	sourceColorFromImage,
} from "@material/material-color-utilities";
import { createEffect, createRoot } from "solid-js";
import { getTrackCoverUrl, usePlayer } from "./player";
import { getSettings } from "./settings";

// ============================================================================
// ARGB → HSL conversion
// ============================================================================

function argbToHsl(argb: number): [number, number, number] {
	const r = redFromArgb(argb) / 255;
	const g = greenFromArgb(argb) / 255;
	const b = blueFromArgb(argb) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		return [0, 0, Math.round(l * 100)];
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h: number;
	if (max === r) {
		h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	} else if (max === g) {
		h = ((b - r) / d + 2) / 6;
	} else {
		h = ((r - g) / d + 4) / 6;
	}

	return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Format HSL values as a CSS custom property value (e.g. "260 80% 60%") */
function hslString(argb: number): string {
	const [h, s, l] = argbToHsl(argb);
	return `${h} ${s}% ${l}%`;
}

// ============================================================================
// Source color extraction
// ============================================================================

/** Cache source colors by cover art ID to avoid re-processing */
const sourceColorCache = new Map<string, number>();

async function extractSourceColor(
	coverArtUrl: string,
	coverArtId: string,
): Promise<number> {
	const cached = sourceColorCache.get(coverArtId);
	if (cached !== undefined) {
		return cached;
	}

	const img = new Image();
	img.crossOrigin = "anonymous";

	const sourceColor = await new Promise<number>((resolve, reject) => {
		img.onload = async () => {
			try {
				const color = await sourceColorFromImage(img);
				resolve(color);
			} catch (err) {
				reject(err);
			}
		};
		img.onerror = () => reject(new Error("Failed to load cover art image"));
		img.src = coverArtUrl;
	});

	sourceColorCache.set(coverArtId, sourceColor);
	return sourceColor;
}

// ============================================================================
// CSS variable mapping
// ============================================================================

interface ThemeMapping {
	variable: string;
	getter: (scheme: SchemeContent) => number;
}

function getThemeMappings(): ThemeMapping[] {
	return [
		// Primary
		{ variable: "--primary", getter: (s) => s.primary },
		{ variable: "--primary-foreground", getter: (s) => s.onPrimary },

		// Secondary (mapped from secondary container for softer surfaces)
		{ variable: "--secondary", getter: (s) => s.secondaryContainer },
		{
			variable: "--secondary-foreground",
			getter: (s) => s.onSecondaryContainer,
		},

		// Accent (mapped from tertiary container)
		{ variable: "--accent", getter: (s) => s.tertiaryContainer },
		{
			variable: "--accent-foreground",
			getter: (s) => s.onTertiaryContainer,
		},

		// Surfaces
		{ variable: "--background", getter: (s) => s.surface },
		{ variable: "--foreground", getter: (s) => s.onSurface },

		{ variable: "--sidebar", getter: (s) => s.surface },
		{ variable: "--main-content", getter: (s) => s.surfaceContainerLow },
		{ variable: "--cards", getter: (s) => s.surface },

		{ variable: "--muted", getter: (s) => s.surfaceContainerLow },
		{ variable: "--muted-foreground", getter: (s) => s.onSurfaceVariant },

		{ variable: "--card", getter: (s) => s.surfaceContainer },
		{ variable: "--card-foreground", getter: (s) => s.onSurface },

		{ variable: "--popover", getter: (s) => s.surfaceContainer },
		{ variable: "--popover-foreground", getter: (s) => s.onSurface },

		// Borders & inputs
		{ variable: "--border", getter: (s) => s.outlineVariant },
		{ variable: "--input", getter: (s) => s.outlineVariant },

		// Ring (focus ring)
		{ variable: "--ring", getter: (s) => s.primary },

		// Destructive stays the same (always red-based)
		// Error colors from M3
		{ variable: "--error", getter: (s) => s.errorContainer },
		{ variable: "--error-foreground", getter: (s) => s.onErrorContainer },
	];
}

// Track which CSS properties we've set so we can clean them up
const dynamicProperties = new Set<string>();

function applyDynamicTheme(sourceColor: number): void {
	const root = document.documentElement;
	const isDark = root.classList.contains("dark");

	const hct = Hct.fromInt(sourceColor);

	// Generate light and dark schemes
	const lightScheme = new SchemeContent(hct, false, 0.0);
	const darkScheme = new SchemeContent(hct, true, 0.0);

	// Apply the appropriate scheme based on current mode
	const activeScheme = isDark ? darkScheme : lightScheme;

	// Apply to root (covers both light and dark since we use one set of variables)
	for (const mapping of getThemeMappings()) {
		const value = hslString(mapping.getter(activeScheme));
		root.style.setProperty(mapping.variable, value);
		dynamicProperties.add(mapping.variable);
	}
}

/** Remove all dynamically set CSS custom properties, restoring stylesheet defaults */
function resetDynamicTheme(): void {
	const root = document.documentElement;
	for (const prop of Array.from(dynamicProperties)) {
		root.style.removeProperty(prop);
	}
	dynamicProperties.clear();
}

// ============================================================================
// Reactive watcher
// ============================================================================

/** Current cover art ID being processed — used to skip stale results */
let currentProcessingId: string | null = null;

/** Stored source color so we can re-apply on theme toggle */
let activeSourceColor: number | null = null;

/**
 * Re-applies the dynamic theme when light/dark mode changes.
 * Called from theme.ts after applying the theme class.
 */
export function onThemeModeChanged(): void {
	if (activeSourceColor !== null && getSettings().dynamicPlayerBackground) {
		applyDynamicTheme(activeSourceColor);
	}
}

/**
 * Initialize a reactive watcher that tracks the current track's cover art
 * and the dynamic theme setting. When both are active, it extracts the
 * source color and applies the M3 scheme.
 */
export function initDynamicThemeWatcher(): void {
	createRoot(() => {
		const player = usePlayer();

		createEffect(() => {
			const enabled = getSettings().dynamicPlayerBackground;
			const coverArt = player.playerState.currentTrack?.coverArt;

			if (!enabled || !coverArt) {
				// Reset theme when disabled or no track
				resetDynamicTheme();
				activeSourceColor = null;
				currentProcessingId = null;
				return;
			}

			// Avoid re-processing the same cover art
			if (coverArt === currentProcessingId) {
				return;
			}

			currentProcessingId = coverArt;
			const processingId = coverArt;

			// Load cover art URL and extract source color
			getTrackCoverUrl(coverArt, 200)
				.then((url) => {
					if (!url || currentProcessingId !== processingId) return;
					return extractSourceColor(url, coverArt);
				})
				.then((sourceColor) => {
					// Check if we're still processing the same cover art
					if (
						sourceColor === undefined ||
						currentProcessingId !== processingId
					) {
						return;
					}

					activeSourceColor = sourceColor;
					applyDynamicTheme(sourceColor);
				})
				.catch((err) => {
					console.warn("Failed to extract theme from cover art:", err);
				});
		});
	});
}
