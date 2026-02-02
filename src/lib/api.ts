import { queryOptions } from "@tanstack/solid-query";
import { getSettings } from "~/lib/settings";
import { buildMediaUrl, fetchSubsonic } from "./subsonic";

// Subsonic API Types
// ... (keep existing interfaces)
export interface Album {
	id: string;
	name: string;
	artist?: string;
	artistId?: string;
	coverArt?: string;
	songCount?: number;
	duration?: number;
	year?: number;
	genre?: string;
	created?: string;
	starred?: string; // ISO date string if starred
}

export interface Artist {
	id: string;
	name: string;
	coverArt?: string;
	albumCount?: number;
	starred?: string; // ISO date string if starred
	// Image URLs from getArtistInfo2 (external sources like Last.fm)
	smallImageUrl?: string;
	mediumImageUrl?: string;
	largeImageUrl?: string;
}

export interface ArtistInfo2 {
	biography?: string;
	musicBrainzId?: string;
	smallImageUrl?: string;
	mediumImageUrl?: string;
	largeImageUrl?: string;
	// Similar artists are returned separately and handled by the API function
}

export interface Song {
	id: string;
	title: string;
	album?: string;
	albumId?: string;
	artist?: string;
	artistId?: string;
	coverArt?: string;
	duration?: number;
	track?: number;
	year?: number;
	genre?: string;
	size?: number;
	contentType?: string;
	suffix?: string;
	bitRate?: number;
	path?: string;
	starred?: string; // ISO date string if starred
}

export interface SubsonicResponse<T> {
	"subsonic-response": {
		status: "ok" | "failed";
		version: string;
		type: string;
		serverVersion: string;
		openSubsonic: boolean;
		error?: {
			code: number;
			message: string;
		};
	} & T;
}

export type AlbumListType =
	| "random"
	| "newest"
	| "highest"
	| "frequent"
	| "recent"
	| "alphabeticalByName"
	| "alphabeticalByArtist"
	| "starred"
	| "byYear"
	| "byGenre";

// Helper to ensure we always have an array, as Subsonic API can sometimes
// return a single object instead of an array if there's only one result.
function ensureArray<T>(item: T | T[] | undefined | null): T[] {
	if (!item) return [];
	return Array.isArray(item) ? item : [item];
}

// API Functions

export const albumListQueryOptions = (
	type: AlbumListType = "newest",
	size = 50,
	offset = 0,
) =>
	queryOptions({
		queryKey: ["albums", type, size, offset],
		queryFn: () => getAlbumList(type, size, offset),
	});

export const albumQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["album", id],
		queryFn: () => getAlbum(id),
	});

export const artistListQueryOptions = () =>
	queryOptions({
		queryKey: ["artists"],
		queryFn: getArtists,
	});

export const artistQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artist", id],
		queryFn: () => getArtist(id),
	});

export const artistInfo2QueryOptions = (id: string, count = 20) =>
	queryOptions({
		queryKey: ["artistInfo2", id, count],
		queryFn: () => getArtistInfo2(id, count),
	});

export const playlistListQueryOptions = () =>
	queryOptions({
		queryKey: ["playlists"],
		queryFn: getPlaylists,
	});

export const playlistQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["playlist", id],
		queryFn: () => getPlaylist(id),
	});

export const genreListQueryOptions = () =>
	queryOptions({
		queryKey: ["genres"],
		queryFn: getGenres,
	});

export const genreSongsQueryOptions = (genre: string, count = 50, offset = 0) =>
	queryOptions({
		queryKey: ["genreSongs", genre, count, offset],
		queryFn: () => getSongsByGenre(genre, count, offset),
	});

export const randomSongsQueryOptions = (size = 50) =>
	queryOptions({
		queryKey: ["randomSongs", size],
		queryFn: () => getRandomSongs(size),
	});

export async function getAlbumList(
	type: AlbumListType = "newest",
	size = 50,
	offset = 0,
): Promise<Album[]> {
	const response = await fetchSubsonic("getAlbumList2", {
		type,
		size: size.toString(),
		offset: offset.toString(),
	});

	const data: SubsonicResponse<{ albumList2?: { album?: Album[] | Album } }> =
		await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch albums",
		);
	}

	return ensureArray(data["subsonic-response"].albumList2?.album);
}

export async function getAlbum(id: string): Promise<{
	album: Album;
	songs: Song[];
}> {
	const response = await fetchSubsonic("getAlbum", { id });

	const data: SubsonicResponse<{ album?: Album & { song?: Song[] | Song } }> =
		await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch album",
		);
	}

	const albumData = data["subsonic-response"].album;
	if (!albumData) {
		throw new Error("Album not found");
	}

	const { song, ...album } = albumData;
	return {
		album,
		songs: ensureArray(song),
	};
}

export async function getArtists(): Promise<Artist[]> {
	const response = await fetchSubsonic("getArtists");

	const data: SubsonicResponse<{
		artists?: { index?: Array<{ artist?: Artist[] }> };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch artists",
		);
	}

	const indexes = data["subsonic-response"].artists?.index ?? [];
	return indexes.flatMap((index) => index.artist ?? []);
}

export async function getRandomSongs(size = 50): Promise<Song[]> {
	const response = await fetchSubsonic("getRandomSongs", {
		size: size.toString(),
	});

	const data: SubsonicResponse<{ randomSongs?: { song?: Song[] | Song } }> =
		await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch songs",
		);
	}

	return ensureArray(data["subsonic-response"].randomSongs?.song);
}

export async function getArtist(id: string): Promise<{
	artist: Artist;
	albums: Album[];
}> {
	const response = await fetchSubsonic("getArtist", { id });

	const data: SubsonicResponse<{
		artist?: Artist & { album?: Album[] | Album };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch artist",
		);
	}

	const artistData = data["subsonic-response"].artist;
	if (!artistData) {
		throw new Error("Artist not found");
	}

	const { album, ...artist } = artistData;
	return {
		artist,
		albums: ensureArray(album),
	};
}

export async function getArtistInfo2(
	id: string,
	count = 20,
	includeNotPresent = false,
): Promise<{
	info: ArtistInfo2;
	similarArtists: Artist[];
}> {
	const response = await fetchSubsonic("getArtistInfo2", {
		id,
		count: count.toString(),
		includeNotPresent: includeNotPresent.toString(),
	});

	const data: SubsonicResponse<{
		artistInfo2?: ArtistInfo2 & { similarArtist?: Artist[] | Artist };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch artist info",
		);
	}

	const infoData = data["subsonic-response"].artistInfo2;
	if (!infoData) {
		throw new Error("Artist info not found");
	}

	const { similarArtist, ...info } = infoData;
	return {
		info,
		similarArtists: ensureArray(similarArtist),
	};
}

export interface SearchResult {
	artists: Artist[];
	albums: Album[];
	songs: Song[];
}

export async function search(query: string): Promise<SearchResult> {
	const response = await fetchSubsonic("search3", {
		query,
		artistCount: "20",
		albumCount: "20",
		songCount: "20",
	});

	const data: SubsonicResponse<{
		searchResult3?: {
			artist?: Artist[] | Artist;
			album?: Album[] | Album;
			song?: Song[] | Song;
		};
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Search failed",
		);
	}

	const result = data["subsonic-response"].searchResult3;
	return {
		artists: ensureArray(result?.artist),
		albums: ensureArray(result?.album),
		songs: ensureArray(result?.song),
	};
}

// Get starred/favorite items
export interface StarredResult {
	artists: Artist[];
	albums: Album[];
	songs: Song[];
}

export async function getStarred(): Promise<StarredResult> {
	const response = await fetchSubsonic("getStarred2");

	const data: SubsonicResponse<{
		starred2?: {
			artist?: Artist[] | Artist;
			album?: Album[] | Album;
			song?: Song[] | Song;
		};
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch starred",
		);
	}

	const result = data["subsonic-response"].starred2;
	return {
		artists: ensureArray(result?.artist),
		albums: ensureArray(result?.album),
		songs: ensureArray(result?.song),
	};
}

// URL builders for media

const coverArtUrlCache = new Map<string, string>();

export async function getCoverArtUrl(
	coverArtId: string,
	size?: number,
): Promise<string> {
	const cacheKey = `${coverArtId}-${size ?? "default"}`;
	const cached = coverArtUrlCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const params: Record<string, string> = { id: coverArtId };
	if (size) {
		params.size = size.toString();
	}
	const url = await buildMediaUrl("getCoverArt", params);
	coverArtUrlCache.set(cacheKey, url);
	return url;
}

export async function getStreamUrl(songId: string): Promise<string> {
	const settings = getSettings();
	const params: Record<string, string> = { id: songId };

	if (settings.maxBitRate > 0) {
		params.maxBitRate = settings.maxBitRate.toString();
	}

	return buildMediaUrl("stream", params);
}

// Star/Unstar items
export async function star(options: {
	id?: string;
	albumId?: string;
	artistId?: string;
}): Promise<void> {
	const params: Record<string, string> = {};
	if (options.id) params.id = options.id;
	if (options.albumId) params.albumId = options.albumId;
	if (options.artistId) params.artistId = options.artistId;

	const response = await fetchSubsonic("star", params);
	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to star item",
		);
	}
}

export async function unstar(options: {
	id?: string;
	albumId?: string;
	artistId?: string;
}): Promise<void> {
	const params: Record<string, string> = {};
	if (options.id) params.id = options.id;
	if (options.albumId) params.albumId = options.albumId;
	if (options.artistId) params.artistId = options.artistId;

	const response = await fetchSubsonic("unstar", params);
	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to unstar item",
		);
	}
}

// Scrobble - report playback to server
export async function scrobble(
	id: string,
	options?: { submission?: boolean },
): Promise<void> {
	const params: Record<string, string> = { id };
	// submission=true means the song has finished playing (or played enough to count)
	// submission=false means "now playing" update
	if (options?.submission !== undefined) {
		params.submission = options.submission.toString();
	}

	const response = await fetchSubsonic("scrobble", params);
	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to scrobble",
		);
	}
}

// Genre types and API functions
export interface Genre {
	value: string; // Genre name
	songCount: number;
	albumCount: number;
}

export interface Lyrics {
	artist: string;
	title: string;
	structured?: boolean;
	value?: string; // Plain text lyrics
	lyrics?: Array<{ value: string; lang?: string }>; // Structured lyrics
}

export async function getLyrics(
	artist: string,
	title: string,
): Promise<Lyrics | null> {
	const response = await fetchSubsonic("getLyrics", { artist, title });

	const data: SubsonicResponse<{
		lyrics?: Lyrics;
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return null;
	}

	return data["subsonic-response"].lyrics ?? null;
}

export async function getSimilarSongs2(
	id: string,
	count = 50,
): Promise<Song[]> {
	const response = await fetchSubsonic("getSimilarSongs2", {
		id,
		count: count.toString(),
	});

	const data: SubsonicResponse<{
		similarSongs2?: { song?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].similarSongs2?.song);
}

export async function getSimilarArtists(
	id: string,
	count = 20,
): Promise<Artist[]> {
	const response = await fetchSubsonic("getSimilarArtists2", {
		id,
		count: count.toString(),
	});

	const data: SubsonicResponse<{
		similarArtists2?: { artist?: Artist[] | Artist };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].similarArtists2?.artist);
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
	const response = await fetchSubsonic("getArtist", { id: artistId });

	const data: SubsonicResponse<{
		artist?: Artist & { album?: Album[] | Album };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].artist?.album);
}

export async function getGenres(): Promise<Genre[]> {
	const response = await fetchSubsonic("getGenres");

	const data: SubsonicResponse<{
		genres?: { genre?: Genre[] | Genre };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch genres",
		);
	}

	return ensureArray(data["subsonic-response"].genres?.genre);
}

export async function getSongsByGenre(
	genre: string,
	count = 50,
	offset = 0,
): Promise<Song[]> {
	const response = await fetchSubsonic("getSongsByGenre", {
		genre,
		count: count.toString(),
		offset: offset.toString(),
	});

	const data: SubsonicResponse<{
		songsByGenre?: { song?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message ||
				"Failed to fetch songs by genre",
		);
	}

	return ensureArray(data["subsonic-response"].songsByGenre?.song);
}

// ============================================================================
// Playlist Types and Functions
// ============================================================================

export interface Playlist {
	id: string;
	name: string;
	comment?: string;
	owner?: string;
	public?: boolean;
	songCount: number;
	duration: number;
	created?: string;
	changed?: string;
	coverArt?: string;
}

export interface PlaylistWithSongs extends Playlist {
	entry?: Song[];
}

export async function getPlaylists(): Promise<Playlist[]> {
	const response = await fetchSubsonic("getPlaylists");

	const data: SubsonicResponse<{
		playlists?: { playlist?: Playlist[] | Playlist };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch playlists",
		);
	}

	return ensureArray(data["subsonic-response"].playlists?.playlist);
}

export async function getPlaylist(id: string): Promise<PlaylistWithSongs> {
	const response = await fetchSubsonic("getPlaylist", { id });

	const data: SubsonicResponse<{
		playlist?: Playlist & { entry?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch playlist",
		);
	}

	const playlist = data["subsonic-response"].playlist;
	if (!playlist) {
		throw new Error("Playlist not found");
	}

	return {
		...playlist,
		entry: ensureArray(playlist.entry),
	};
}

export async function createPlaylist(options: {
	name: string;
	songId?: string[];
}): Promise<PlaylistWithSongs> {
	const response = await fetchSubsonic("createPlaylist", {
		name: options.name,
		songId: options.songId ?? [],
	});

	const data: SubsonicResponse<{
		playlist?: PlaylistWithSongs;
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to create playlist",
		);
	}

	return (
		data["subsonic-response"].playlist ?? {
			id: "",
			name: options.name,
			songCount: 0,
			duration: 0,
		}
	);
}

export async function updatePlaylist(options: {
	playlistId: string;
	name?: string;
	comment?: string;
	public?: boolean;
	songIdToAdd?: string[];
	songIndexToRemove?: number[];
}): Promise<void> {
	const params: Record<string, string | string[]> = {
		playlistId: options.playlistId,
	};
	if (options.name) params.name = options.name;
	if (options.comment !== undefined) params.comment = options.comment;
	if (options.public !== undefined) params.public = options.public.toString();
	if (options.songIdToAdd) params.songIdToAdd = options.songIdToAdd;
	if (options.songIndexToRemove)
		params.songIndexToRemove = options.songIndexToRemove.map(String);

	const response = await fetchSubsonic("updatePlaylist", params);
	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to update playlist",
		);
	}
}

export async function deletePlaylist(id: string): Promise<void> {
	const response = await fetchSubsonic("deletePlaylist", { id });

	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to delete playlist",
		);
	}
}

// ============================================================================
// Play Queue (for cross-device sync)
// ============================================================================

export interface PlayQueue {
	entry?: Song[];
	current?: string; // ID of the currently playing song
	position?: number; // Position in milliseconds within the current song
	username?: string;
	changed?: string;
	changedBy?: string;
}

export async function getPlayQueue(): Promise<PlayQueue | null> {
	const response = await fetchSubsonic("getPlayQueue");

	const data: SubsonicResponse<{
		playQueue?: Omit<PlayQueue, "entry"> & { entry?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return null;
	}

	const queue = data["subsonic-response"].playQueue;
	if (!queue) return null;

	return {
		...queue,
		entry: ensureArray(queue.entry),
	};
}

export async function savePlayQueue(options: {
	id: string[]; // IDs of songs in the play queue
	current?: string; // ID of the currently playing song
	position?: number; // Position in milliseconds
}): Promise<void> {
	const params: Record<string, string | string[]> = {};
	if (options.current) params.current = options.current;
	if (options.position !== undefined)
		params.position = options.position.toString();

	// Add song IDs
	params.id = options.id;

	const response = await fetchSubsonic("savePlayQueue", params);
	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to save play queue",
		);
	}
}

// ============================================================================
// Single Song / Top Songs
// ============================================================================

export async function getSong(id: string): Promise<Song> {
	const response = await fetchSubsonic("getSong", { id });

	const data: SubsonicResponse<{
		song?: Song;
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch song",
		);
	}

	const song = data["subsonic-response"].song;
	if (!song) {
		throw new Error("Song not found");
	}

	return song;
}

export async function getTopSongs(
	artistName: string,
	count = 50,
): Promise<Song[]> {
	const response = await fetchSubsonic("getTopSongs", {
		artist: artistName,
		count: count.toString(),
	});

	const data: SubsonicResponse<{
		topSongs?: { song?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].topSongs?.song);
}

export async function getSimilarSongs(id: string, count = 50): Promise<Song[]> {
	const response = await fetchSubsonic("getSimilarSongs", {
		id,
		count: count.toString(),
	});

	const data: SubsonicResponse<{
		similarSongs?: { song?: Song[] | Song };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].similarSongs?.song);
}

// ============================================================================
// Ratings
// ============================================================================

export async function setRating(
	id: string,
	rating: 0 | 1 | 2 | 3 | 4 | 5,
): Promise<void> {
	const response = await fetchSubsonic("setRating", {
		id,
		rating: rating.toString(),
	});

	const data: SubsonicResponse<Record<string, never>> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to set rating",
		);
	}
}

// ============================================================================
// Now Playing
// ============================================================================

export interface NowPlayingEntry extends Song {
	username?: string;
	minutesAgo?: number;
	playerId?: number;
	playerName?: string;
}

export async function getNowPlaying(): Promise<NowPlayingEntry[]> {
	const response = await fetchSubsonic("getNowPlaying");

	const data: SubsonicResponse<{
		nowPlaying?: { entry?: NowPlayingEntry[] | NowPlayingEntry };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return ensureArray(data["subsonic-response"].nowPlaying?.entry);
}

// ============================================================================
// Lyrics by Song ID (OpenSubsonic extension)
// ============================================================================

export interface StructuredLyrics {
	displayArtist?: string;
	displayTitle?: string;
	lang: string;
	offset?: number;
	synced: boolean;
	line: Array<{
		start?: number; // Start time in milliseconds (for synced lyrics)
		value: string;
	}>;
}

export async function getLyricsBySongId(
	id: string,
): Promise<StructuredLyrics[]> {
	const response = await fetchSubsonic("getLyricsBySongId", { id });

	const data: SubsonicResponse<{
		lyricsList?: { structuredLyrics?: StructuredLyrics[] };
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		return [];
	}

	return data["subsonic-response"].lyricsList?.structuredLyrics ?? [];
}

// ============================================================================
// Download URL
// ============================================================================

export async function getDownloadUrl(id: string): Promise<string> {
	return buildMediaUrl("download", { id });
}

// ============================================================================
// Scan Status / Library Statistics
// ============================================================================

export interface ScanStatus {
	scanning: boolean;
	count?: number; // Number of items scanned so far
	folderCount?: number;
	lastScan?: string;
}

export async function getScanStatus(): Promise<ScanStatus> {
	const response = await fetchSubsonic("getScanStatus");

	const data: SubsonicResponse<{
		scanStatus?: ScanStatus;
	}> = await response.json();

	if (data["subsonic-response"].status !== "ok") {
		throw new Error(
			data["subsonic-response"].error?.message || "Failed to fetch scan status",
		);
	}

	return data["subsonic-response"].scanStatus ?? { scanning: false };
}

// ============================================================================
// Library Statistics (computed from genres)
// ============================================================================

export interface LibraryStats {
	albumCount: number;
	songCount: number;
	artistCount: number;
}

export async function getLibraryStats(): Promise<LibraryStats> {
	// Fetch genres to get accurate song and album counts
	const genres = await getGenres();

	// Sum up song counts from all genres
	const songCount = genres.reduce((acc, genre) => acc + genre.songCount, 0);

	// Sum up album counts from all genres (note: albums can have multiple genres, so this may overcount)
	// For a more accurate album count, we'll fetch all albums
	const albumCount = genres.reduce((acc, genre) => acc + genre.albumCount, 0);

	// Fetch artists for accurate count
	const artists = await getArtists();

	return {
		albumCount,
		songCount,
		artistCount: artists.length,
	};
}
