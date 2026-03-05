import { createStore } from "solid-js/store";
import type { Song } from "./api";
import {
	getCoverArtUrl,
	getPlayQueue,
	getRemoteCommands,
	getRemoteState,
	getSong,
	getStreamUrl,
	savePlayQueue,
	scrobble,
	sendRemoteCommand,
	updateRemoteState,
} from "./api";
import {
	type AudioBackend,
	type AudioBackendEvents,
	Html5AudioBackend,
} from "./audio-backend";
import { getSettings } from "./settings";

// ============================================================================
// Audio Backend Management
// ============================================================================

let currentBackend: AudioBackend | null = null;

function getBackendEventHandlers(): AudioBackendEvents {
	return {
		onTimeUpdate: (time: number, duration: number) => {
			updateState({ currentTime: time, duration });

			// Update media session position
			if ("mediaSession" in navigator && duration > 0) {
				navigator.mediaSession.setPositionState({
					duration,
					playbackRate: 1,
					position: time,
				});
			}

			// Scrobble logic
			const currentTrack = playerState.currentTrack;
			if (
				currentTrack &&
				currentTrack.id !== scrobbledTrackId &&
				duration > 0 &&
				getSettings().scrobblingEnabled
			) {
				const scrobbleThreshold = Math.min(240, duration * 0.5);
				if (time >= scrobbleThreshold) {
					scrobbledTrackId = currentTrack.id;
					scrobble(currentTrack.id, { submission: true }).catch((err) => {
						console.error("Failed to scrobble:", err);
					});
				}
			}
		},
		onEnded: () => {
			playNext();
		},
		onPlaying: () => {
			updateState({ isPlaying: true, isLoading: false });
			updateMediaSessionState(true);
		},
		onPaused: () => {
			updateState({ isPlaying: false });
			updateMediaSessionState(false);
		},
		onLoading: () => {
			updateState({ isLoading: true });
		},
		onCanPlay: () => {
			updateState({ isLoading: false });
		},
		onError: (error: Error) => {
			console.error("Audio error:", error);
			updateState({ isLoading: false, isPlaying: false });
		},
	};
}

function getAudioBackend(): AudioBackend {
	if (!currentBackend) {
		currentBackend = new Html5AudioBackend();
		currentBackend.setVolume(playerState.volume);
		currentBackend.setEventHandlers(getBackendEventHandlers());
	}

	return currentBackend;
}

// Media Session API support
if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
	navigator.mediaSession.setActionHandler("play", () => {
		play();
	});
	navigator.mediaSession.setActionHandler("pause", () => {
		pause();
	});
	navigator.mediaSession.setActionHandler("previoustrack", () => {
		playPrevious();
	});
	navigator.mediaSession.setActionHandler("nexttrack", () => {
		playNext();
	});
	navigator.mediaSession.setActionHandler("seekto", (details) => {
		if (details.seekTime !== undefined) {
			seek(details.seekTime);
		}
	});
}

function updateMediaSession(song: Song) {
	// Get cover art URL first for Media Session metadata.
	getTrackCoverUrl(song.coverArt, 300).then((coverUrl) => {
		if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: song.title,
				artist: song.artist,
				album: song.album,
				artwork: coverUrl
					? [
							{
								src: coverUrl,
								sizes: "300x300",
								type: "image/jpeg",
							},
						]
					: [],
			});
		}
	});
}

function updateMediaSessionState(isPlaying: boolean) {
	if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
		navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
	}
}

export type RepeatMode = "off" | "all" | "one";

export interface PlayerState {
	currentTrack: Song | null;
	queue: Song[];
	originalQueue: Song[]; // Original queue order before shuffle
	queueIndex: number;
	isPlaying: boolean;
	volume: number;
	currentTime: number;
	duration: number;
	isLoading: boolean;
	shuffle: boolean;
	repeat: RepeatMode;
}

// ============================================================================
// Volume Persistence
// ============================================================================

const VOLUME_STORAGE_KEY = "subsonic_player_volume";

function getSavedVolume(): number {
	try {
		const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
		if (saved) {
			const volume = parseFloat(saved);
			if (!Number.isNaN(volume) && volume >= 0 && volume <= 1) {
				return volume;
			}
		}
	} catch (err) {
		console.warn("Failed to read volume from localStorage:", err);
	}
	return 1;
}

function saveVolumeToStorage(volume: number) {
	try {
		localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
	} catch (err) {
		console.warn("Failed to save volume to localStorage:", err);
	}
}

const initialState: PlayerState = {
	currentTrack: null,
	queue: [],
	originalQueue: [],
	queueIndex: -1,
	isPlaying: false,
	volume: getSavedVolume(),
	currentTime: 0,
	duration: 0,
	isLoading: false,
	shuffle: false,
	repeat: "off",
};

// ============================================================================
// State Management (Solid Store)
// ============================================================================

const [playerState, setPlayerState] = createStore<PlayerState>({
	...initialState,
});

// Track scrobbling state - we only scrobble once per song play
let scrobbledTrackId: string | null = null;
let nowPlayingReported: string | null = null;

function updateState(updates: Partial<PlayerState>) {
	setPlayerState(updates);
}

// ============================================================================
// Play Queue Sync (cross-device) - declarations before use
// ============================================================================

// Debounce timer for saving queue
let saveQueueTimeout: ReturnType<typeof setTimeout> | null = null;
let queueSyncEnabled = false;

const REMOTE_HOST_SESSION_STORAGE_KEY = "solidsonic_remote_host_session_id";
const REMOTE_CONTROLLER_SESSION_STORAGE_KEY =
	"solidsonic_remote_controller_session_id";
const MAX_REMOTE_QUEUE_ITEMS = 200;
let remoteHostSessionId: string | null = null;
let remoteControllerSessionId: string | null = null;
let remoteLastCommandId = 0;
let remoteCommandPollTimer: ReturnType<typeof setInterval> | null = null;
let remoteStateSyncTimer: ReturnType<typeof setInterval> | null = null;
let remoteControllerStatePollTimer: ReturnType<typeof setInterval> | null =
	null;
let remoteCommandPollInFlight = false;
let remoteStateSyncInFlight = false;
let remoteControllerStatePollInFlight = false;
let remoteControllerQueueSyncInFlight = false;
let remoteLastCommandPollAt: number | null = null;
let remoteLastStatePushAt: number | null = null;
let remoteControllerQueueSignature: string | null = null;
const remoteControllerSongCache = new Map<string, Song>();
const remoteControllerSongRequests = new Map<string, Promise<Song | null>>();

interface RemoteControllerTrackSnapshot {
	id?: string;
	title?: string;
	artist?: string;
	album?: string;
	coverArt?: string;
}

interface RemoteControllerPlaybackSnapshot {
	isPlaying?: boolean;
	currentTimeMs?: number;
	durationMs?: number;
	volume?: number;
	shuffle?: boolean;
	repeat?: RepeatMode;
	queueIndex?: number;
	queueSongIds?: string[];
	currentTrack?: RemoteControllerTrackSnapshot;
}

function hasStateUpdates(updates: Partial<PlayerState>): boolean {
	return Object.keys(updates).length > 0;
}

// Save current queue to server (debounced)
function debouncedSaveQueue() {
	if (!queueSyncEnabled) return;

	if (saveQueueTimeout) {
		clearTimeout(saveQueueTimeout);
	}

	saveQueueTimeout = setTimeout(() => {
		const { queue, currentTrack, currentTime } = playerState;
		if (queue.length === 0) return;

		const songIds = queue.map((s) => s.id);
		savePlayQueue({
			id: songIds,
			current: currentTrack?.id,
			position: Math.floor(currentTime * 1000), // Convert to milliseconds
		}).catch((err) => {
			console.error("Failed to save play queue:", err);
		});
	}, 2000); // Save after 2 seconds of inactivity
}

function getPlayerStateSnapshot(): PlayerState {
	return {
		currentTrack: playerState.currentTrack,
		queue: [...playerState.queue],
		originalQueue: [...playerState.originalQueue],
		queueIndex: playerState.queueIndex,
		isPlaying: playerState.isPlaying,
		volume: playerState.volume,
		currentTime: playerState.currentTime,
		duration: playerState.duration,
		isLoading: playerState.isLoading,
		shuffle: playerState.shuffle,
		repeat: playerState.repeat,
	};
}

function canControlRemoteHost(): boolean {
	return remoteControllerSessionId !== null && remoteHostSessionId === null;
}

function buildRemoteQueuePayload(
	queue: Song[],
	requestedIndex: number,
): {
	songIds: string[];
	index: number;
} {
	if (queue.length <= MAX_REMOTE_QUEUE_ITEMS) {
		return {
			songIds: queue.map((song) => song.id),
			index: Math.max(0, Math.min(requestedIndex, queue.length - 1)),
		};
	}

	const windowStart = Math.max(
		0,
		Math.min(
			requestedIndex - Math.floor(MAX_REMOTE_QUEUE_ITEMS / 2),
			queue.length - MAX_REMOTE_QUEUE_ITEMS,
		),
	);
	const windowQueue = queue.slice(
		windowStart,
		windowStart + MAX_REMOTE_QUEUE_ITEMS,
	);

	return {
		songIds: windowQueue.map((song) => song.id),
		index: requestedIndex - windowStart,
	};
}

async function sendRemoteCommandIfControllerAsync(
	command: string,
	payload?: Record<string, unknown>,
): Promise<boolean> {
	if (!canControlRemoteHost() || !remoteControllerSessionId) {
		return false;
	}

	try {
		await sendRemoteCommand({
			sessionId: remoteControllerSessionId,
			command,
			payload: payload ? JSON.stringify(payload) : undefined,
		});
		return true;
	} catch (err) {
		console.warn("Remote control command failed:", err);
		setRemoteControllerSessionId(null);
		return false;
	}
}

function sendRemoteCommandIfController(
	command: string,
	payload?: Record<string, unknown>,
): boolean {
	if (!canControlRemoteHost() || !remoteControllerSessionId) {
		return false;
	}

	void sendRemoteCommand({
		sessionId: remoteControllerSessionId,
		command,
		payload: payload ? JSON.stringify(payload) : undefined,
	}).catch((err) => {
		console.warn("Remote control command failed:", err);
		setRemoteControllerSessionId(null);
	});

	return true;
}

function parseRemoteQueueSongIds(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => (typeof item === "string" ? item : String(item)))
		.filter((songId) => songId.length > 0);
}

function createRemoteSnapshotSong(
	track: RemoteControllerTrackSnapshot | undefined,
	fallbackId?: string,
): Song | null {
	const trackId =
		typeof track?.id === "string" && track.id.length > 0
			? track.id
			: fallbackId;

	if (!trackId) {
		return null;
	}

	return {
		id: trackId,
		title:
			typeof track?.title === "string" && track.title.length > 0
				? track.title
				: "Unknown title",
		artist: typeof track?.artist === "string" ? track.artist : undefined,
		album: typeof track?.album === "string" ? track.album : undefined,
		coverArt: typeof track?.coverArt === "string" ? track.coverArt : undefined,
	};
}

async function fetchSongForRemoteQueue(songId: string): Promise<Song | null> {
	const cached = remoteControllerSongCache.get(songId);
	if (cached) {
		return cached;
	}

	const inFlight = remoteControllerSongRequests.get(songId);
	if (inFlight) {
		return inFlight;
	}

	const request = getSong(songId)
		.then((song) => {
			remoteControllerSongCache.set(songId, song);
			return song;
		})
		.catch(() => null)
		.finally(() => {
			remoteControllerSongRequests.delete(songId);
		});

	remoteControllerSongRequests.set(songId, request);
	return request;
}

async function syncRemoteControllerQueue(
	songIds: string[],
	requestedIndex: number,
	fallbackTrack: Song | null,
): Promise<void> {
	if (remoteControllerQueueSyncInFlight) {
		return;
	}

	const signature = songIds.join("|");
	if (signature === remoteControllerQueueSignature) {
		return;
	}

	remoteControllerQueueSyncInFlight = true;

	try {
		const queue = (
			await Promise.all(
				songIds.map((songId) => fetchSongForRemoteQueue(songId)),
			)
		).filter((song): song is Song => song !== null);

		if (queue.length === 0) {
			remoteControllerQueueSignature = signature;
			updateState({
				queue: [],
				originalQueue: [],
				queueIndex: -1,
				currentTrack: fallbackTrack,
			});
			return;
		}

		let queueIndex = Math.max(
			0,
			Math.min(Math.trunc(requestedIndex), queue.length - 1),
		);
		if (fallbackTrack?.id) {
			const matchedIndex = queue.findIndex(
				(song) => song.id === fallbackTrack.id,
			);
			if (matchedIndex >= 0) {
				queueIndex = matchedIndex;
			}
		}

		remoteControllerQueueSignature = signature;
		updateState({
			queue,
			originalQueue: queue,
			queueIndex,
			currentTrack: queue[queueIndex] ?? fallbackTrack,
		});
	} finally {
		remoteControllerQueueSyncInFlight = false;
	}
}

async function pollRemoteControllerState(): Promise<void> {
	if (!canControlRemoteHost() || !remoteControllerSessionId) {
		return;
	}

	if (remoteControllerStatePollInFlight) {
		return;
	}

	remoteControllerStatePollInFlight = true;

	try {
		const remoteState = await getRemoteState(remoteControllerSessionId);
		if (!remoteState?.stateJson) {
			return;
		}

		let snapshot: RemoteControllerPlaybackSnapshot | null = null;
		try {
			snapshot = JSON.parse(
				remoteState.stateJson,
			) as RemoteControllerPlaybackSnapshot;
		} catch {
			snapshot = null;
		}

		if (!snapshot) {
			return;
		}

		const updates: Partial<PlayerState> = {};
		const wasPlaying = playerState.isPlaying;
		const parsedQueueIndex =
			typeof snapshot.queueIndex === "number"
				? Math.max(-1, Math.trunc(snapshot.queueIndex))
				: playerState.queueIndex;
		const queueIndexChanged = parsedQueueIndex !== playerState.queueIndex;
		const snapshotTrackId =
			typeof snapshot.currentTrack?.id === "string" &&
			snapshot.currentTrack.id.length > 0
				? snapshot.currentTrack.id
				: undefined;
		const trackChanged =
			snapshotTrackId !== undefined &&
			snapshotTrackId !== playerState.currentTrack?.id;

		if (typeof snapshot.isPlaying === "boolean") {
			if (snapshot.isPlaying !== playerState.isPlaying) {
				updates.isPlaying = snapshot.isPlaying;
			}
		}

		if (typeof snapshot.currentTimeMs === "number") {
			const nextCurrentTime = Math.max(0, snapshot.currentTimeMs / 1000);
			const isPlaybackStateChanging =
				typeof snapshot.isPlaying === "boolean" &&
				snapshot.isPlaying !== wasPlaying;
			const driftSeconds = Math.abs(playerState.currentTime - nextCurrentTime);
			const shouldUpdateTimeWhilePlaying =
				isPlaybackStateChanging || queueIndexChanged || trackChanged;
			const shouldUpdateTimeWhilePaused = driftSeconds >= 1;

			if (
				(wasPlaying && (shouldUpdateTimeWhilePlaying || driftSeconds >= 15)) ||
				(!wasPlaying && shouldUpdateTimeWhilePaused)
			) {
				updates.currentTime = nextCurrentTime;
			}
		}

		if (typeof snapshot.durationMs === "number") {
			const nextDuration = Math.max(0, snapshot.durationMs / 1000);
			if (Math.abs(playerState.duration - nextDuration) >= 1) {
				updates.duration = nextDuration;
			}
		}

		if (typeof snapshot.volume === "number") {
			const nextVolume = Math.max(0, Math.min(1, snapshot.volume));
			if (Math.abs(playerState.volume - nextVolume) >= 0.02) {
				updates.volume = nextVolume;
			}
		}

		if (typeof snapshot.shuffle === "boolean") {
			if (snapshot.shuffle !== playerState.shuffle) {
				updates.shuffle = snapshot.shuffle;
			}
		}

		if (
			snapshot.repeat === "off" ||
			snapshot.repeat === "all" ||
			snapshot.repeat === "one"
		) {
			if (snapshot.repeat !== playerState.repeat) {
				updates.repeat = snapshot.repeat;
			}
		}

		if (queueIndexChanged) {
			updates.queueIndex = parsedQueueIndex;
		}

		const queueSongIds = parseRemoteQueueSongIds(snapshot.queueSongIds);
		const fallbackTrack = createRemoteSnapshotSong(
			snapshot.currentTrack,
			queueSongIds[parsedQueueIndex],
		);

		if (fallbackTrack) {
			if (playerState.currentTrack?.id !== fallbackTrack.id) {
				updates.currentTrack = fallbackTrack;
			}
		}

		if (hasStateUpdates(updates)) {
			updateState(updates);
		}

		if (queueSongIds.length === 0) {
			remoteControllerQueueSignature = "";
			if (playerState.queue.length > 0 || playerState.queueIndex !== -1) {
				updateState({
					queue: [],
					originalQueue: [],
					queueIndex: -1,
					currentTrack: null,
					isPlaying: false,
					currentTime: 0,
					duration: 0,
				});
			}
			return;
		}

		void syncRemoteControllerQueue(
			queueSongIds,
			parsedQueueIndex,
			fallbackTrack,
		);
	} catch (err) {
		if (
			err instanceof Error &&
			err.message.toLowerCase().includes("remote session")
		) {
			setRemoteControllerSessionId(null);
			return;
		}

		console.warn("Remote controller state sync failed:", err);
	} finally {
		remoteControllerStatePollInFlight = false;
	}
}

function startRemoteControllerStateSync() {
	if (remoteControllerStatePollTimer) {
		clearInterval(remoteControllerStatePollTimer);
	}

	remoteControllerQueueSignature = null;
	remoteControllerStatePollTimer = setInterval(() => {
		void pollRemoteControllerState();
	}, 4000);

	void pollRemoteControllerState();
}

function stopRemoteControllerStateSync() {
	if (remoteControllerStatePollTimer) {
		clearInterval(remoteControllerStatePollTimer);
		remoteControllerStatePollTimer = null;
	}

	remoteControllerStatePollInFlight = false;
	remoteControllerQueueSyncInFlight = false;
	remoteControllerQueueSignature = null;
}

async function pollRemoteCommands(): Promise<void> {
	if (!remoteHostSessionId || remoteCommandPollInFlight) return;

	remoteCommandPollInFlight = true;
	try {
		const commands = await getRemoteCommands({
			sessionId: remoteHostSessionId,
			sinceId: remoteLastCommandId,
			limit: 100,
		});

		for (const command of commands) {
			remoteLastCommandId = Math.max(remoteLastCommandId, command.id);
			await applyRemoteCommand(command.command, command.payload);
		}

		remoteLastCommandPollAt = Date.now();
	} catch (err) {
		if (
			err instanceof Error &&
			err.message.toLowerCase().includes("remote session")
		) {
			stopRemoteHostSync();
			return;
		}

		console.warn("Remote command polling failed:", err);
	} finally {
		remoteCommandPollInFlight = false;
	}
}

async function pushRemoteState(): Promise<void> {
	if (!remoteHostSessionId || remoteStateSyncInFlight) return;

	remoteStateSyncInFlight = true;
	try {
		const snapshot = getPlayerStateSnapshot();
		const state = {
			isPlaying: snapshot.isPlaying,
			currentTimeMs: Math.floor(snapshot.currentTime * 1000),
			durationMs: Math.floor(snapshot.duration * 1000),
			volume: snapshot.volume,
			shuffle: snapshot.shuffle,
			repeat: snapshot.repeat,
			queueIndex: snapshot.queueIndex,
			queueSongIds: snapshot.queue.map((song) => song.id),
			currentTrack: snapshot.currentTrack
				? {
						id: snapshot.currentTrack.id,
						title: snapshot.currentTrack.title,
						artist: snapshot.currentTrack.artist,
						album: snapshot.currentTrack.album,
						coverArt: snapshot.currentTrack.coverArt,
					}
				: null,
		};

		await updateRemoteState({
			sessionId: remoteHostSessionId,
			stateJson: JSON.stringify(state),
		});

		remoteLastStatePushAt = Date.now();
	} catch (err) {
		if (
			err instanceof Error &&
			err.message.toLowerCase().includes("remote session")
		) {
			stopRemoteHostSync();
			return;
		}

		console.warn("Remote state sync failed:", err);
	} finally {
		remoteStateSyncInFlight = false;
	}
}

async function applyRemoteCommand(
	command: string,
	payloadJson?: string,
): Promise<void> {
	let payload: Record<string, unknown> | undefined;
	if (payloadJson) {
		try {
			payload = JSON.parse(payloadJson) as Record<string, unknown>;
		} catch {
			payload = undefined;
		}
	}

	switch (command) {
		case "playQueue": {
			const rawSongIds = payload?.songIds;
			const songIds = Array.isArray(rawSongIds)
				? rawSongIds
						.map((value) => (typeof value === "string" ? value : String(value)))
						.filter((value) => value.length > 0)
				: [];

			if (songIds.length === 0) {
				break;
			}

			const queue = (
				await Promise.all(
					songIds.map(async (songId) => {
						try {
							return await getSong(songId);
						} catch {
							return null;
						}
					}),
				)
			).filter((song): song is Song => song !== null);

			if (queue.length === 0) {
				break;
			}

			const requestedIndex = payload?.index;
			const index =
				typeof requestedIndex === "number"
					? Math.max(0, Math.min(Math.trunc(requestedIndex), queue.length - 1))
					: 0;

			await playSong(queue[index], queue, index);

			const positionMs = payload?.positionMs;
			if (typeof positionMs === "number" && positionMs > 0) {
				seek(positionMs / 1000);
			}

			break;
		}
		case "setQueueState": {
			const rawSongIds = payload?.songIds;
			const songIds = Array.isArray(rawSongIds)
				? rawSongIds
						.map((value) => (typeof value === "string" ? value : String(value)))
						.filter((value) => value.length > 0)
				: [];

			if (songIds.length === 0) {
				break;
			}

			const queue = (
				await Promise.all(
					songIds.map(async (songId) => {
						try {
							return await getSong(songId);
						} catch {
							return null;
						}
					}),
				)
			).filter((song): song is Song => song !== null);

			if (queue.length === 0) {
				break;
			}

			const requestedIndex = payload?.index;
			const index =
				typeof requestedIndex === "number"
					? Math.max(0, Math.min(Math.trunc(requestedIndex), queue.length - 1))
					: 0;

			updateState({
				queue,
				originalQueue: queue,
				queueIndex: index,
				currentTrack: queue[index],
			});
			debouncedSaveQueue();
			break;
		}
		case "addToQueue": {
			const rawSongIds = payload?.songIds;
			const songIds = Array.isArray(rawSongIds)
				? rawSongIds
						.map((value) => (typeof value === "string" ? value : String(value)))
						.filter((value) => value.length > 0)
				: [];

			if (songIds.length === 0) {
				break;
			}

			const songs = (
				await Promise.all(
					songIds.map(async (songId) => {
						try {
							return await getSong(songId);
						} catch {
							return null;
						}
					}),
				)
			).filter((song): song is Song => song !== null);

			if (songs.length > 0) {
				addToQueue(songs);
			}
			break;
		}
		case "playNextInQueue": {
			const songId = payload?.songId;
			if (typeof songId !== "string" || songId.length === 0) {
				break;
			}

			try {
				const song = await getSong(songId);
				playNextInQueue(song);
			} catch {
				// Ignore failed song lookup.
			}
			break;
		}
		case "removeFromQueue": {
			const index = payload?.index;
			if (typeof index === "number") {
				removeFromQueue(Math.trunc(index));
			}
			break;
		}
		case "moveInQueue": {
			const fromIndex = payload?.fromIndex;
			const toIndex = payload?.toIndex;
			if (typeof fromIndex === "number" && typeof toIndex === "number") {
				moveInQueue(Math.trunc(fromIndex), Math.trunc(toIndex));
			}
			break;
		}
		case "insertIntoQueue": {
			const songId = payload?.songId;
			const index = payload?.index;
			if (typeof songId !== "string" || songId.length === 0) {
				break;
			}
			if (typeof index !== "number") {
				break;
			}

			try {
				const song = await getSong(songId);
				insertIntoQueue(song, Math.trunc(index));
			} catch {
				// Ignore failed song lookup.
			}
			break;
		}
		case "clearQueue":
			clearQueue();
			break;
		case "play":
			play();
			break;
		case "pause":
			pause();
			break;
		case "togglePlayPause":
			togglePlayPause();
			break;
		case "next":
			await playNext();
			break;
		case "previous":
			await playPrevious();
			break;
		case "seek": {
			const positionMs = payload?.positionMs;
			if (typeof positionMs === "number") {
				seek(positionMs / 1000);
			}
			break;
		}
		case "setVolume": {
			const volume = payload?.volume;
			if (typeof volume === "number") {
				setVolume(Math.min(1, Math.max(0, volume)));
			}
			break;
		}
		case "setQueueIndex": {
			const index = payload?.index;
			if (typeof index === "number") {
				const snapshot = getPlayerStateSnapshot();
				const queueIndex = Math.trunc(index);
				if (queueIndex >= 0 && queueIndex < snapshot.queue.length) {
					const song = snapshot.queue[queueIndex];
					await playSong(song, snapshot.queue, queueIndex);
				}
			}
			break;
		}
		case "toggleShuffle":
			toggleShuffle();
			break;
		case "toggleRepeat":
			toggleRepeat();
			break;
		case "setRepeat": {
			const mode = payload?.mode;
			if (mode === "off" || mode === "all" || mode === "one") {
				setRepeat(mode);
			}
			break;
		}
		default:
			console.debug("Ignoring unknown remote command:", command);
	}
}

export function startRemoteHostSync(sessionId: string) {
	remoteHostSessionId = sessionId;
	remoteLastCommandId = 0;
	remoteLastCommandPollAt = null;
	remoteLastStatePushAt = null;
	stopRemoteControllerStateSync();

	try {
		localStorage.setItem(REMOTE_HOST_SESSION_STORAGE_KEY, sessionId);
	} catch {
		// Ignore localStorage failures
	}

	if (remoteCommandPollTimer) {
		clearInterval(remoteCommandPollTimer);
	}

	if (remoteStateSyncTimer) {
		clearInterval(remoteStateSyncTimer);
	}

	remoteCommandPollTimer = setInterval(() => {
		void pollRemoteCommands();
	}, 700);

	remoteStateSyncTimer = setInterval(() => {
		void pushRemoteState();
	}, 1000);

	void pollRemoteCommands();
	void pushRemoteState();
}

export function stopRemoteHostSync() {
	remoteHostSessionId = null;
	remoteLastCommandId = 0;
	remoteLastCommandPollAt = null;
	remoteLastStatePushAt = null;

	try {
		localStorage.removeItem(REMOTE_HOST_SESSION_STORAGE_KEY);
	} catch {
		// Ignore localStorage failures
	}

	if (remoteCommandPollTimer) {
		clearInterval(remoteCommandPollTimer);
		remoteCommandPollTimer = null;
	}

	if (remoteStateSyncTimer) {
		clearInterval(remoteStateSyncTimer);
		remoteStateSyncTimer = null;
	}

	if (remoteControllerSessionId) {
		startRemoteControllerStateSync();
	}
}

export function getRemoteHostSessionId(): string | null {
	return remoteHostSessionId;
}

export function setRemoteControllerSessionId(sessionId: string | null) {
	remoteControllerSessionId = sessionId;

	if (sessionId && remoteHostSessionId === null) {
		currentBackend?.pause();
	}

	try {
		if (sessionId) {
			localStorage.setItem(REMOTE_CONTROLLER_SESSION_STORAGE_KEY, sessionId);
		} else {
			localStorage.removeItem(REMOTE_CONTROLLER_SESSION_STORAGE_KEY);
		}
	} catch {
		// Ignore localStorage failures
	}

	if (sessionId && remoteHostSessionId === null) {
		startRemoteControllerStateSync();
	} else {
		stopRemoteControllerStateSync();
	}
}

export function getRemoteControllerSessionId(): string | null {
	return remoteControllerSessionId;
}

export interface RemoteHostSyncStatus {
	isActive: boolean;
	sessionId: string | null;
	lastCommandPollAt: number | null;
	lastStatePushAt: number | null;
}

export function getRemoteHostSyncStatus(): RemoteHostSyncStatus {
	return {
		isActive: remoteCommandPollTimer !== null && remoteStateSyncTimer !== null,
		sessionId: remoteHostSessionId,
		lastCommandPollAt: remoteLastCommandPollAt,
		lastStatePushAt: remoteLastStatePushAt,
	};
}

export function initRemoteHostSync() {
	try {
		const sessionId = localStorage.getItem(REMOTE_HOST_SESSION_STORAGE_KEY);
		if (sessionId) {
			startRemoteHostSync(sessionId);
		}

		const controllerSessionId = localStorage.getItem(
			REMOTE_CONTROLLER_SESSION_STORAGE_KEY,
		);
		if (controllerSessionId) {
			setRemoteControllerSessionId(controllerSessionId);
		}
	} catch {
		// Ignore localStorage failures
	}
}

// Player actions
export async function playSong(
	song: Song,
	queue?: Song[],
	startIndex?: number,
) {
	const newQueue = queue ?? [song];
	const currentIndex = startIndex ?? 0;

	if (
		await sendRemoteCommandIfControllerAsync(
			"playQueue",
			buildRemoteQueuePayload(newQueue, currentIndex),
		)
	) {
		return;
	}

	const backend = getAudioBackend();

	// Reset scrobble state for new song
	scrobbledTrackId = null;

	updateState({
		currentTrack: song,
		queue: newQueue,
		originalQueue:
			playerState.originalQueue.length > 0
				? playerState.originalQueue
				: newQueue,
		queueIndex: currentIndex,
		isLoading: true,
	});

	// Trigger queue sync
	debouncedSaveQueue();

	try {
		const streamUrl = await getStreamUrl(song.id);
		await backend.play(streamUrl);

		// Update media session metadata
		updateMediaSession(song);

		// Report "now playing" if not already reported for this song
		if (nowPlayingReported !== song.id && getSettings().scrobblingEnabled) {
			nowPlayingReported = song.id;
			scrobble(song.id, { submission: false }).catch((err) => {
				console.error("Failed to report now playing:", err);
			});
		}
	} catch (error) {
		console.error("Failed to play song:", error);
		updateState({ isLoading: false });
	}
}

export async function playAlbum(songs: Song[], startIndex = 0) {
	if (songs.length === 0) return;
	await playSong(songs[startIndex], songs, startIndex);
}

export function togglePlayPause() {
	if (sendRemoteCommandIfController("togglePlayPause")) {
		return;
	}

	const backend = getAudioBackend();
	if (playerState.isPlaying) {
		backend.pause();
		updateState({ isPlaying: false });
	} else if (playerState.currentTrack) {
		backend.resume();
		updateState({ isPlaying: true });
	}
}

export function pause() {
	if (sendRemoteCommandIfController("pause")) {
		return;
	}

	getAudioBackend().pause();
	updateState({ isPlaying: false });
}

export function play() {
	if (sendRemoteCommandIfController("play")) {
		return;
	}

	if (playerState.currentTrack) {
		getAudioBackend().resume();
	}
}

export async function playNext() {
	if (await sendRemoteCommandIfControllerAsync("next")) {
		return;
	}

	const { queue, queueIndex, repeat, currentTrack } = playerState;
	if (queue.length === 0) return;

	// Repeat one: replay current track
	if (repeat === "one" && currentTrack) {
		seek(0);
		getAudioBackend().resume();
		return;
	}

	const nextIndex = queueIndex + 1;
	if (nextIndex < queue.length) {
		await playSong(queue[nextIndex], queue, nextIndex);
	} else if (repeat === "all") {
		// Repeat all: go back to start
		await playSong(queue[0], queue, 0);
	} else {
		// End of queue
		updateState({ isPlaying: false });
		getAudioBackend().pause();
	}
}

export async function playPrevious() {
	if (await sendRemoteCommandIfControllerAsync("previous")) {
		return;
	}

	const { queue, queueIndex, currentTime, repeat } = playerState;
	if (queue.length === 0) return;

	// If more than 3 seconds in, restart current track
	if (currentTime > 3) {
		seek(0);
		return;
	}

	const prevIndex = queueIndex - 1;
	if (prevIndex >= 0) {
		await playSong(queue[prevIndex], queue, prevIndex);
	} else if (repeat === "all") {
		// Repeat all: go to last track
		await playSong(queue[queue.length - 1], queue, queue.length - 1);
	} else {
		// At start, just restart
		seek(0);
	}
}

export function seek(time: number) {
	if (
		sendRemoteCommandIfController("seek", {
			positionMs: Math.floor(time * 1000),
		})
	) {
		return;
	}

	const backend = getAudioBackend();
	// Update state immediately for smooth UI
	updateState({ currentTime: time });
	backend.seek(time);
	debouncedSaveQueue();
}

export function setVolume(volume: number) {
	if (sendRemoteCommandIfController("setVolume", { volume })) {
		return;
	}

	const backend = getAudioBackend();
	const clampedVolume = Math.max(0, Math.min(1, volume));
	backend.setVolume(clampedVolume);
	updateState({ volume: clampedVolume });
	saveVolumeToStorage(clampedVolume);
}

export function addToQueue(songs: Song[]) {
	if (songs.length === 0) {
		return;
	}

	if (
		sendRemoteCommandIfController("addToQueue", {
			songIds: songs.map((song) => song.id),
		})
	) {
		return;
	}

	updateState({
		queue: [...playerState.queue, ...songs],
		originalQueue: [...playerState.originalQueue, ...songs],
	});
	debouncedSaveQueue();
}

export function playNextInQueue(song: Song) {
	if (sendRemoteCommandIfController("playNextInQueue", { songId: song.id })) {
		return;
	}

	const { queue, originalQueue, queueIndex } = playerState;
	// Insert the song right after the current track
	const newQueue = [
		...queue.slice(0, queueIndex + 1),
		song,
		...queue.slice(queueIndex + 1),
	];
	const newOriginalQueue = [
		...originalQueue.slice(0, queueIndex + 1),
		song,
		...originalQueue.slice(queueIndex + 1),
	];
	updateState({
		queue: newQueue,
		originalQueue: newOriginalQueue,
	});
	debouncedSaveQueue();
}

export function clearQueue(): {
	previousQueue: Song[];
	previousOriginalQueue: Song[];
	previousQueueIndex: number;
} | null {
	if (sendRemoteCommandIfController("clearQueue")) {
		return null;
	}

	const { queue, currentTrack, originalQueue, queueIndex } = playerState;

	// Store previous state for undo
	const previousState = {
		previousQueue: [...queue],
		previousOriginalQueue: [...originalQueue],
		previousQueueIndex: queueIndex,
	};

	// If there's a current track, keep only that song in the queue
	if (currentTrack && queue.length > 1) {
		updateState({
			queue: [currentTrack],
			originalQueue: [currentTrack],
			queueIndex: 0,
		});
		debouncedSaveQueue();
		return previousState;
	}
	// Otherwise completely clear the queue
	const backend = getAudioBackend();
	backend.stop();
	updateState({ ...initialState, volume: playerState.volume });
	debouncedSaveQueue();
	return previousState;
}

// Restore a previously saved queue state (for undo)
export function restoreQueueState(state: {
	previousQueue: Song[];
	previousOriginalQueue: Song[];
	previousQueueIndex: number;
}) {
	const { previousQueue, previousOriginalQueue, previousQueueIndex } = state;
	if (previousQueue.length === 0) return;

	if (
		sendRemoteCommandIfController("setQueueState", {
			songIds: previousQueue.map((song) => song.id),
			index: previousQueueIndex,
		})
	) {
		return;
	}

	updateState({
		queue: previousQueue,
		originalQueue: previousOriginalQueue,
		queueIndex: previousQueueIndex,
		currentTrack: previousQueue[previousQueueIndex],
	});
	debouncedSaveQueue();
}

export function removeFromQueue(
	index: number,
): { song: Song; index: number } | null {
	if (sendRemoteCommandIfController("removeFromQueue", { index })) {
		return null;
	}

	const { queue, originalQueue, queueIndex, currentTrack } = playerState;

	// Don't allow removing the currently playing song
	if (index === queueIndex && currentTrack) {
		return null;
	}

	const removedSong = queue[index];

	// Remove from both queues
	const newQueue = queue.filter((_, i) => i !== index);
	const newOriginalQueue = originalQueue.filter((_, i) => i !== index);

	// Adjust queueIndex if needed
	let newQueueIndex = queueIndex;
	if (index < queueIndex) {
		newQueueIndex = queueIndex - 1;
	}

	updateState({
		queue: newQueue,
		originalQueue: newOriginalQueue,
		queueIndex: newQueueIndex,
	});
	debouncedSaveQueue();

	return { song: removedSong, index };
}

export function moveInQueue(fromIndex: number, toIndex: number) {
	if (sendRemoteCommandIfController("moveInQueue", { fromIndex, toIndex })) {
		return;
	}

	const { queue, queueIndex } = playerState;

	if (
		fromIndex < 0 ||
		fromIndex >= queue.length ||
		toIndex < 0 ||
		toIndex >= queue.length ||
		fromIndex === toIndex
	) {
		return;
	}

	const newQueue = [...queue];
	const [movedItem] = newQueue.splice(fromIndex, 1);
	newQueue.splice(toIndex, 0, movedItem);

	// We also need to update the originalQueue to maintain consistency if shuffle is off,
	// or if we want the "original" order to reflect manual changes.
	// For now, let's assume manual reordering affects the current playback order (queue).
	// If shuffle is ON, reordering the *shuffled* queue is what the user expects.
	// Updating originalQueue is tricky if shuffled. Let's just update `queue`.

	let newQueueIndex = queueIndex;
	if (queueIndex === fromIndex) {
		newQueueIndex = toIndex;
	} else if (queueIndex > fromIndex && queueIndex <= toIndex) {
		newQueueIndex--;
	} else if (queueIndex < fromIndex && queueIndex >= toIndex) {
		newQueueIndex++;
	}

	updateState({
		queue: newQueue,
		queueIndex: newQueueIndex,
	});
	debouncedSaveQueue();
}

// Re-insert a song at a specific index in the queue (for undo)
export function insertIntoQueue(song: Song, index: number) {
	if (
		sendRemoteCommandIfController("insertIntoQueue", { songId: song.id, index })
	) {
		return;
	}

	const { queue, originalQueue, queueIndex } = playerState;

	const newQueue = [...queue.slice(0, index), song, ...queue.slice(index)];
	const newOriginalQueue = [
		...originalQueue.slice(0, index),
		song,
		...originalQueue.slice(index),
	];

	// Adjust queueIndex if needed
	let newQueueIndex = queueIndex;
	if (index <= queueIndex) {
		newQueueIndex = queueIndex + 1;
	}

	updateState({
		queue: newQueue,
		originalQueue: newOriginalQueue,
		queueIndex: newQueueIndex,
	});
	debouncedSaveQueue();
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function toggleShuffle() {
	if (sendRemoteCommandIfController("toggleShuffle")) {
		return;
	}

	const { shuffle, queue, queueIndex, currentTrack, originalQueue } =
		playerState;

	if (!shuffle) {
		// Enable shuffle: save original queue and shuffle remaining songs
		const currentSong = currentTrack;
		const remainingSongs = queue.filter((_, i) => i !== queueIndex);
		const shuffledRemaining = shuffleArray(remainingSongs);

		// Put current song first, then shuffled remaining
		const newQueue = currentSong
			? [currentSong, ...shuffledRemaining]
			: shuffledRemaining;

		updateState({
			shuffle: true,
			originalQueue: originalQueue.length > 0 ? originalQueue : queue,
			queue: newQueue,
			queueIndex: 0,
		});
		debouncedSaveQueue();
	} else {
		// Disable shuffle: restore original queue order
		const currentSong = currentTrack;
		const newIndex = currentSong
			? originalQueue.findIndex((s) => s.id === currentSong.id)
			: 0;

		updateState({
			shuffle: false,
			queue: originalQueue,
			queueIndex: newIndex >= 0 ? newIndex : 0,
		});
		debouncedSaveQueue();
	}
}

export function toggleRepeat() {
	if (sendRemoteCommandIfController("toggleRepeat")) {
		return;
	}

	const { repeat } = playerState;
	const modes: RepeatMode[] = ["off", "all", "one"];
	const currentIndex = modes.indexOf(repeat);
	const nextMode = modes[(currentIndex + 1) % modes.length];
	updateState({ repeat: nextMode });
}

export function setRepeat(mode: RepeatMode) {
	if (sendRemoteCommandIfController("setRepeat", { mode })) {
		return;
	}

	updateState({ repeat: mode });
}

// Update the starred status of the current track (for optimistic UI updates)
export function updateCurrentTrackStarred(starred: boolean) {
	const { currentTrack, queue, queueIndex } = playerState;
	if (!currentTrack) return;

	const updatedTrack = {
		...currentTrack,
		starred: starred ? new Date().toISOString() : undefined,
	};

	// Update the track in the queue as well
	const updatedQueue = [...queue];
	if (queueIndex >= 0 && queueIndex < updatedQueue.length) {
		updatedQueue[queueIndex] = updatedTrack;
	}

	updateState({
		currentTrack: updatedTrack,
		queue: updatedQueue,
	});
}

// Save queue immediately (for page unload)
export function saveQueueNow(): Promise<void> {
	const { queue, currentTrack, currentTime } = playerState;
	if (queue.length === 0) return Promise.resolve();

	const songIds = queue.map((s) => s.id);
	return savePlayQueue({
		id: songIds,
		current: currentTrack?.id,
		position: Math.floor(currentTime * 1000),
	});
}

// Restore queue from server
export async function restoreQueue(): Promise<boolean> {
	try {
		const playQueue = await getPlayQueue();
		if (!playQueue?.entry || playQueue.entry.length === 0) {
			return false;
		}

		const songs = playQueue.entry;
		const currentId = playQueue.current;
		const positionMs = playQueue.position ?? 0;

		// Find the current song index
		let currentIndex = 0;
		if (currentId) {
			const idx = songs.findIndex((s) => s.id === currentId);
			if (idx >= 0) currentIndex = idx;
		}

		// Update state with restored queue (don't auto-play)
		updateState({
			queue: songs,
			originalQueue: songs,
			currentTrack: songs[currentIndex],
			queueIndex: currentIndex,
			currentTime: positionMs / 1000, // Convert from milliseconds
		});

		// Prepare audio backend but don't play
		// For HTML5, we need to load the source
		const backend = getAudioBackend();
		if (backend.name === "html5") {
			const streamUrl = await getStreamUrl(songs[currentIndex].id);
			// For HTML5, we need to access the underlying audio element
			// This is a bit of a hack, but necessary for restoring position
			const html5Backend = backend as InstanceType<typeof Html5AudioBackend>;
			await html5Backend.play(streamUrl);
			html5Backend.pause();
			backend.seek(positionMs / 1000);
		}

		// Update media session
		updateMediaSession(songs[currentIndex]);

		return true;
	} catch (err) {
		console.error("Failed to restore play queue:", err);
		return false;
	}
}

// Enable queue sync - call this after user is authenticated
export function enableQueueSync() {
	if (queueSyncEnabled) return;
	queueSyncEnabled = true;

	// Save queue on page unload
	window.addEventListener("beforeunload", () => {
		if (playerState.queue.length > 0) {
			saveQueueNow();
		}
	});
}

// Check if queue sync is enabled
export function isQueueSyncEnabled(): boolean {
	return queueSyncEnabled;
}

// Cover art URL cache
const coverArtCache = new Map<string, string>();

export async function getTrackCoverUrl(
	coverArtId: string | undefined,
	size = 100,
): Promise<string | null> {
	if (!coverArtId) return null;

	const cacheKey = `${coverArtId}-${size}`;
	const cached = coverArtCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const url = await getCoverArtUrl(coverArtId, size);
	coverArtCache.set(cacheKey, url);
	return url;
}

// Hook
export function usePlayer() {
	return {
		// Return the store directly for reactivity
		playerState,
		// Also expose properties for convenience (though accessing store directly is preferred in Solid)
		get currentTrack() {
			return playerState.currentTrack;
		},
		get queue() {
			return playerState.queue;
		},
		get queueIndex() {
			return playerState.queueIndex;
		},
		get isPlaying() {
			return playerState.isPlaying;
		},
		get volume() {
			return playerState.volume;
		},
		get currentTime() {
			return playerState.currentTime;
		},
		get duration() {
			return playerState.duration;
		},
		get isLoading() {
			return playerState.isLoading;
		},
		get shuffle() {
			return playerState.shuffle;
		},
		get repeat() {
			return playerState.repeat;
		},

		playSong,
		playAlbum,
		togglePlayPause,
		play,
		pause,
		playNext,
		playPrevious,
		seek,
		setVolume,
		addToQueue,
		playNextInQueue,
		removeFromQueue,
		moveInQueue,
		insertIntoQueue,
		clearQueue,
		restoreQueueState,
		toggleShuffle,
		toggleRepeat,
		setRepeat,
	};
}
