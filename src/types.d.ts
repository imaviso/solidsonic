export {};

declare global {
	interface Window {
		electronAPI?: {
			platform: string;
			isElectron: boolean;
			auth?: {
				save: (credentials: {
					serverUrl: string;
					username: string;
					password: string;
				}) => Promise<boolean>;
				get: () => Promise<{
					serverUrl: string;
					username: string;
					password: string;
				} | null>;
				clear: () => Promise<boolean>;
			};
			mpv?: {
				// Availability and configuration
				isAvailable: (customPath?: string) => Promise<boolean>;
				setPath: (path: string) => Promise<boolean>;
				getPath: () => Promise<string>;
				selectPath: () => Promise<string | null>;

				// Lifecycle
				initialize: (data?: {
					binaryPath?: string;
					extraParameters?: string[];
					properties?: Record<string, unknown>;
				}) => Promise<boolean>;
				restart: (data?: {
					binaryPath?: string;
					extraParameters?: string[];
					properties?: Record<string, unknown>;
				}) => Promise<boolean>;
				isRunning: () => Promise<boolean>;
				cleanup: () => Promise<void>;
				quit: () => void;

				// Playback controls
				play: (url: string) => Promise<boolean>;
				setQueue: (
					current?: string,
					next?: string,
					pause?: boolean,
				) => Promise<void>;
				setQueueNext: (url?: string) => Promise<void>;
				autoNext: (url?: string) => void;
				pause: () => Promise<void>;
				resume: () => Promise<void>;
				stop: () => Promise<void>;
				seek: (time: number) => Promise<void>;
				volume: (value: number) => void;
				mute: (mute: boolean) => void;
				setMetadata: (metadata: {
					title: string;
					artist?: string;
					album?: string;
					artUrl?: string;
					trackId?: string;
					length?: number;
				}) => void;
				setPlaybackStatus: (status: "Playing" | "Paused" | "Stopped") => void;
				setMprisPosition: (seconds: number) => void;
				updateSeek: (seconds: number) => void;
				updateVolume: (volume: number) => void;

				// State queries
				getPosition: () => Promise<number>;
				getDuration: () => Promise<number>;

				// Event listeners - return cleanup functions
				onTimeUpdate: (
					callback: (data: { position: number; duration: number }) => void,
				) => () => void;
				onEnded: (callback: () => void) => () => void;
				onAutoNext: (callback: () => void) => () => void;
				onError: (callback: (error: string) => void) => () => void;
				onStateChange: (
					callback: (state: { playing: boolean; loading: boolean }) => void,
				) => () => void;
				onFallback: (callback: (isError: boolean) => void) => () => void;

				// MPRIS control events (from D-Bus)
				onMprisPlay: (callback: () => void) => () => void;
				onMprisPause: (callback: () => void) => () => void;
				onMprisPlayPause: (callback: () => void) => () => void;
				onMprisStop: (callback: () => void) => () => void;
				onMprisNext: (callback: () => void) => () => void;
				onMprisPrevious: (callback: () => void) => () => void;
				onMprisSeek: (callback: (offset: number) => void) => () => void;
				onMprisSetPosition: (
					callback: (position: number) => void,
				) => () => void;
				onMprisVolume: (callback: (volume: number) => void) => () => void;
			};
		};
	}
}
