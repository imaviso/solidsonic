import { QueryClient } from "@tanstack/solid-query";

const ONE_MINUTE = 60_000;
const FIVE_MINUTES = 5 * ONE_MINUTE;
const THIRTY_MINUTES = 30 * ONE_MINUTE;

function shouldRetry(failureCount: number, error: unknown) {
	if (failureCount >= 2) return false;
	if (error instanceof Error && error.name === "AbortError") return false;
	if (error instanceof TypeError) return true;
	return true;
}

export const queryKeys = {
	albums: {
		all: ["albums"] as const,
		list: (type: string, size: number, offset: number) =>
			["albums", "list", type, size, offset] as const,
		detail: (id: string) => ["albums", "detail", id] as const,
		infiniteNewest: (size: number) =>
			["albums", "list", "newest", "infinite", size] as const,
	},
	artists: {
		all: ["artists"] as const,
		detail: (id: string) => ["artists", "detail", id] as const,
		info: (id: string, count: number) =>
			["artists", "info", id, count] as const,
	},
	playlists: {
		all: ["playlists"] as const,
		detail: (id: string) => ["playlists", "detail", id] as const,
	},
	genres: {
		all: ["genres"] as const,
		songs: (genre: string, count: number, offset: number) =>
			["genres", "songs", genre, count, offset] as const,
	},
	songs: {
		random: (size: number) => ["songs", "random", size] as const,
		randomInfinite: (size: number) =>
			["songs", "random", "infinite", size] as const,
	},
	starred: {
		all: ["starred"] as const,
	},
	search: {
		term: (query: string) => ["search", query] as const,
	},
	lyrics: {
		bySong: (songId: string) => ["lyrics", songId] as const,
	},
};

export function createAppQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: FIVE_MINUTES,
				gcTime: THIRTY_MINUTES,
				retry: shouldRetry,
				retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
				refetchOnWindowFocus: true,
				refetchOnReconnect: true,
				networkMode: "online",
			},
			mutations: {
				retry: 1,
				networkMode: "online",
			},
		},
	});
}
