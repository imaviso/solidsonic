// ============================================================================
// Audio Backend Interface
// ============================================================================

export interface AudioBackendEvents {
	onTimeUpdate: (time: number, duration: number) => void;
	onEnded: () => void;
	onPlaying: () => void;
	onPaused: () => void;
	onLoading: () => void;
	onCanPlay: () => void;
	onError: (error: Error) => void;
}

export interface AudioBackend {
	readonly name: string;

	initialize(): Promise<boolean>;
	destroy(): void;
	play(url: string): Promise<void>;
	setQueue(current: string, next?: string, pause?: boolean): Promise<void>;
	setQueueNext(url?: string): Promise<void>;
	pause(): void;
	resume(): void;
	stop(): void;
	seek(time: number): void;
	setVolume(volume: number): void;
	getCurrentTime(): number;
	getDuration(): number;
	getVolume(): number;
	isPlaying(): boolean;
	setEventHandlers(handlers: AudioBackendEvents): void;
}

// ============================================================================
// HTML5 Audio Backend
// ============================================================================

export class Html5AudioBackend implements AudioBackend {
	readonly name = "html5";
	private audio: HTMLAudioElement;
	private handlers: AudioBackendEvents | null = null;

	constructor() {
		this.audio = new Audio();
		this.setupEventListeners();
	}

	async initialize(): Promise<boolean> {
		return true;
	}

	private setupEventListeners() {
		this.audio.addEventListener("timeupdate", () => {
			this.handlers?.onTimeUpdate(
				this.audio.currentTime,
				this.audio.duration || 0,
			);
		});

		this.audio.addEventListener("durationchange", () => {
			this.handlers?.onTimeUpdate(
				this.audio.currentTime,
				this.audio.duration || 0,
			);
		});

		this.audio.addEventListener("ended", () => {
			this.handlers?.onEnded();
		});

		this.audio.addEventListener("playing", () => {
			this.handlers?.onPlaying();
		});

		this.audio.addEventListener("pause", () => {
			this.handlers?.onPaused();
		});

		this.audio.addEventListener("waiting", () => {
			this.handlers?.onLoading();
		});

		this.audio.addEventListener("canplay", () => {
			this.handlers?.onCanPlay();
		});

		this.audio.addEventListener("error", () => {
			this.handlers?.onError(
				new Error(this.audio.error?.message || "Audio error"),
			);
		});
	}

	async play(url: string): Promise<void> {
		this.audio.src = url;
		await this.audio.play();
	}

	async setQueue(
		current: string,
		_next?: string,
		pause?: boolean,
	): Promise<void> {
		this.audio.src = current;
		if (!pause) {
			await this.audio.play();
		}
	}

	async setQueueNext(_url?: string): Promise<void> {}

	pause(): void {
		this.audio.pause();
	}

	resume(): void {
		void this.audio.play();
	}

	stop(): void {
		this.audio.pause();
		this.audio.src = "";
	}

	seek(time: number): void {
		if (this.audio.src) {
			this.audio.currentTime = time;
		}
	}

	setVolume(volume: number): void {
		this.audio.volume = Math.max(0, Math.min(1, volume));
	}

	getCurrentTime(): number {
		return this.audio.currentTime;
	}

	getDuration(): number {
		return this.audio.duration || 0;
	}

	getVolume(): number {
		return this.audio.volume;
	}

	isPlaying(): boolean {
		return !this.audio.paused;
	}

	setEventHandlers(handlers: AudioBackendEvents): void {
		this.handlers = handlers;
	}

	destroy(): void {
		this.audio.pause();
		this.audio.src = "";
		this.handlers = null;
	}
}
