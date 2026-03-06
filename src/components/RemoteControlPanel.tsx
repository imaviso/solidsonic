import {
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
	IconPlayerSkipBackFilled,
	IconPlayerSkipForwardFilled,
	IconRewindBackward10,
	IconRewindForward10,
} from "@tabler/icons-solidjs";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { toast } from "solid-sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
	Slider,
	SliderFill,
	SliderThumb,
	SliderTrack,
} from "~/components/ui/slider";
import {
	closeRemoteSession,
	createRemoteSession,
	getRemoteSession,
	getRemoteState,
	joinRemoteSession,
	type RemoteSession,
	type RemoteState,
	sendRemoteCommand,
} from "~/lib/api";
import {
	getRemoteControllerSessionId,
	getRemoteHostSessionId,
	getRemoteHostSyncStatus,
	type RemoteHostSyncStatus,
	setRemoteControllerSessionId,
	startRemoteHostSync,
	stopRemoteHostSync,
} from "~/lib/player";

interface RemotePlaybackSnapshot {
	isPlaying?: boolean;
	currentTimeMs?: number;
	durationMs?: number;
	volume?: number;
	shuffle?: boolean;
	repeat?: string;
	queueIndex?: number;
	queueSongIds?: string[];
	currentTrack?: {
		title?: string;
		artist?: string;
		album?: string;
	};
}

function formatDurationMs(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatExpiresIn(expiresAt: string, nowMs: number): string {
	const expiresMs = Date.parse(expiresAt);
	if (Number.isNaN(expiresMs)) {
		return "-";
	}

	const remainingMs = expiresMs - nowMs;
	if (remainingMs <= 0) {
		return "Expired";
	}

	const remainingSeconds = Math.floor(remainingMs / 1000);
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function parseRemoteSnapshot(
	state: RemoteState | null,
): RemotePlaybackSnapshot | null {
	if (!state?.stateJson) {
		return null;
	}

	try {
		return JSON.parse(state.stateJson) as RemotePlaybackSnapshot;
	} catch {
		return null;
	}
}

export function RemoteControlPanel() {
	const [hostSession, setHostSession] = createSignal<RemoteSession | null>(
		null,
	);
	const [hostSyncStatus, setHostSyncStatus] =
		createSignal<RemoteHostSyncStatus>(getRemoteHostSyncStatus());
	const [controllerSession, setControllerSession] =
		createSignal<RemoteSession | null>(null);
	const [joinCode, setJoinCode] = createSignal("");
	const [remoteState, setRemoteState] = createSignal<RemoteState | null>(null);
	const [seekDraftMs, setSeekDraftMs] = createSignal<number | null>(null);
	const [queueIndexInput, setQueueIndexInput] = createSignal("");
	const [nowMs, setNowMs] = createSignal(Date.now());

	const snapshot = createMemo(() => parseRemoteSnapshot(remoteState()));
	const queueLength = createMemo(() => snapshot()?.queueSongIds?.length ?? 0);
	const currentQueueIndex = createMemo(() => {
		const value = snapshot()?.queueIndex;
		return typeof value === "number" ? Math.max(0, Math.trunc(value)) : -1;
	});
	const durationMs = createMemo(() => {
		const value = snapshot()?.durationMs;
		return typeof value === "number" ? Math.max(0, Math.trunc(value)) : 0;
	});
	const currentTimeMs = createMemo(() => {
		const value = snapshot()?.currentTimeMs;
		return typeof value === "number" ? Math.max(0, Math.trunc(value)) : 0;
	});
	const effectiveSeekMs = createMemo(() => {
		const draft = seekDraftMs();
		if (draft === null) {
			return currentTimeMs();
		}

		const max = durationMs();
		return max > 0 ? Math.min(max, Math.max(0, draft)) : Math.max(0, draft);
	});

	createEffect(() => {
		setSeekDraftMs(currentTimeMs());
	});

	createEffect(() => {
		if (currentQueueIndex() >= 0) {
			setQueueIndexInput(String(currentQueueIndex() + 1));
		}
	});

	onMount(() => {
		const existingSessionId = getRemoteHostSessionId();
		if (existingSessionId) {
			setHostSession({
				id: existingSessionId,
				expiresAt: "",
				hostDeviceId: "",
				connected: false,
			});
		}

		const existingControllerSessionId = getRemoteControllerSessionId();
		if (existingControllerSessionId) {
			setControllerSession({
				id: existingControllerSessionId,
				expiresAt: "",
				hostDeviceId: "",
				connected: true,
			});
		}
	});

	onMount(() => {
		const timer = setInterval(() => {
			setHostSyncStatus(getRemoteHostSyncStatus());
			setNowMs(Date.now());
		}, 1000);

		onCleanup(() => clearInterval(timer));
	});

	createEffect(() => {
		const sessionId = hostSession()?.id;
		if (!sessionId) {
			return;
		}

		let cancelled = false;

		const fetchHostSession = async () => {
			const session = await getRemoteSession(sessionId);
			if (cancelled) {
				return;
			}

			if (!session) {
				stopRemoteHostSync();
				setHostSyncStatus(getRemoteHostSyncStatus());
				setHostSession(null);
				toast.error("Host session expired");
				return;
			}

			setHostSession(session);
		};

		void fetchHostSession();
		const timer = setInterval(() => {
			void fetchHostSession();
		}, 2000);

		onCleanup(() => {
			cancelled = true;
			clearInterval(timer);
		});
	});

	createEffect(() => {
		const sessionId = controllerSession()?.id;
		if (!sessionId) {
			return;
		}

		let cancelled = false;

		const fetchControllerSession = async () => {
			const session = await getRemoteSession(sessionId);
			if (cancelled) {
				return;
			}

			if (!session) {
				setRemoteControllerSessionId(null);
				setControllerSession(null);
				setRemoteState(null);
				setSeekDraftMs(null);
				toast.error("Controller session expired");
				return;
			}

			setControllerSession(session);
		};

		void fetchControllerSession();
		const timer = setInterval(() => {
			void fetchControllerSession();
		}, 2000);

		onCleanup(() => {
			cancelled = true;
			clearInterval(timer);
		});
	});

	createEffect(() => {
		const sessionId = controllerSession()?.id;
		if (!sessionId) {
			setRemoteState(null);
			return;
		}

		let cancelled = false;

		const fetchState = async () => {
			const state = await getRemoteState(sessionId);
			if (cancelled) {
				return;
			}
			setRemoteState(state);
		};

		void fetchState();
		const timer = setInterval(() => {
			void fetchState();
		}, 1000);

		onCleanup(() => {
			cancelled = true;
			clearInterval(timer);
		});
	});

	const handleCreateRemoteSession = async () => {
		try {
			const session = await createRemoteSession({
				deviceName: "SolidSonic Host",
				ttlSeconds: 300,
			});
			startRemoteHostSync(session.id);
			setHostSession(session);
			setHostSyncStatus(getRemoteHostSyncStatus());
			toast.success("Remote session started");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create remote session",
			);
		}
	};

	const handleStopRemoteHost = async () => {
		const sessionId = hostSession()?.id;
		if (sessionId) {
			try {
				await closeRemoteSession(sessionId);
			} catch {
				// Best effort close.
			}
		}

		stopRemoteHostSync();
		setHostSyncStatus(getRemoteHostSyncStatus());
		setHostSession(null);
		toast.success("Remote host stopped");
	};

	const handleJoinRemoteSession = async () => {
		const code = joinCode().trim();
		if (!code) {
			toast.error("Enter a pairing code");
			return;
		}

		try {
			const session = await joinRemoteSession(code, {
				deviceName: "SolidSonic Controller",
			});
			setControllerSession(session);
			setRemoteControllerSessionId(session.id);
			setJoinCode("");
			toast.success("Joined remote session");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to join remote session",
			);
		}
	};

	const handleLeaveControllerSession = () => {
		setRemoteControllerSessionId(null);
		setControllerSession(null);
		setRemoteState(null);
		setSeekDraftMs(null);
		toast.success("Left controller session");
	};

	const handleSendRemoteCommand = async (
		command: string,
		payload?: Record<string, unknown>,
	) => {
		const session = controllerSession();
		if (!session) {
			toast.error("Join a remote session first");
			return;
		}

		try {
			await sendRemoteCommand({
				sessionId: session.id,
				command,
				payload: payload ? JSON.stringify(payload) : undefined,
			});
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to send remote command",
			);
		}
	};

	const handleSeekCommit = (value: number[]) => {
		const seekMs = Math.trunc(value[0] ?? 0);
		setSeekDraftMs(seekMs);
		void handleSendRemoteCommand("seek", { positionMs: seekMs });
	};

	const handleQueueJump = () => {
		const parsed = Number.parseInt(queueIndexInput(), 10);
		if (Number.isNaN(parsed) || parsed < 1 || parsed > queueLength()) {
			toast.error(`Enter a track number between 1 and ${queueLength()}`);
			return;
		}

		void handleSendRemoteCommand("setQueueIndex", { index: parsed - 1 });
	};

	const hostHeartbeatAgeMs = createMemo(() => {
		const last = hostSyncStatus().lastStatePushAt;
		return last === null ? null : Date.now() - last;
	});

	const hostExpiresIn = createMemo(() => {
		const expiresAt = hostSession()?.expiresAt;
		return expiresAt ? formatExpiresIn(expiresAt, nowMs()) : "-";
	});

	const controllerExpiresIn = createMemo(() => {
		const expiresAt = controllerSession()?.expiresAt;
		return expiresAt ? formatExpiresIn(expiresAt, nowMs()) : "-";
	});

	return (
		<div class="space-y-6">
			<div class="space-y-3">
				<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
					<h3 class="text-sm font-medium">Host This Player</h3>
					<Show
						when={hostSession()}
						fallback={
							<Button
								class="w-full sm:w-auto"
								onClick={handleCreateRemoteSession}
							>
								Start Host
							</Button>
						}
					>
						<Button
							variant="destructive"
							class="w-full sm:w-auto"
							onClick={handleStopRemoteHost}
						>
							Stop Host
						</Button>
					</Show>
				</div>

				<Show when={hostSession()}>
					<div class="space-y-2 rounded-2xl bg-muted/50 p-3">
						<p class="text-sm text-muted-foreground">Pairing code</p>
						<p class="text-xl font-mono tracking-widest sm:text-2xl">
							{hostSession()?.pairingCode ?? "(joined)"}
						</p>
						<p class="text-xs text-muted-foreground break-all">
							Session ID: {hostSession()?.id}
						</p>
						<p class="text-xs text-muted-foreground">
							Controller: {hostSession()?.connected ? "Connected" : "Waiting"}
						</p>
						<p class="text-xs text-muted-foreground">
							Expires in: {hostExpiresIn()}
						</p>
						<p class="text-xs text-muted-foreground">
							Host heartbeat: {hostSyncStatus().isActive ? "Active" : "Stopped"}
							{hostHeartbeatAgeMs() !== null &&
								` (${Math.round((hostHeartbeatAgeMs() ?? 0) / 1000)}s ago)`}
						</p>
					</div>
				</Show>
			</div>

			<Separator />

			<div class="space-y-3">
				<h3 class="text-sm font-medium">Join As Controller</h3>
				<div class="flex flex-col gap-2 sm:flex-row">
					<Input
						class="h-11 text-base"
						value={joinCode()}
						onInput={(event) => setJoinCode(event.currentTarget.value)}
						placeholder="Enter 6-digit code"
					/>
					<Button
						class="h-11 w-full sm:w-auto sm:px-6"
						onClick={handleJoinRemoteSession}
					>
						Join
					</Button>
				</div>

				<Show when={controllerSession()}>
					<div class="space-y-4 rounded-2xl bg-muted/50 p-3 pb-24 sm:p-4 md:pb-3">
						<div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
							<p class="text-sm font-medium">Controller Connected</p>
							<Button
								variant="outline"
								class="w-full sm:w-auto"
								onClick={handleLeaveControllerSession}
							>
								Leave
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Session expires in: {controllerExpiresIn()}
						</p>
						<p class="text-xs text-muted-foreground">
							Remote mode is active: play actions in this app control the host.
						</p>

						<div class="hidden gap-2 md:grid md:grid-cols-5">
							<Button
								variant="outline"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("play")}
							>
								Play
							</Button>
							<Button
								variant="outline"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("pause")}
							>
								Pause
							</Button>
							<Button
								variant="outline"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("previous")}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("togglePlayPause")}
							>
								Play/Pause
							</Button>
							<Button
								variant="outline"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("next")}
							>
								Next
							</Button>
						</div>

						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Button
								variant="secondary"
								class="h-10"
								onClick={() =>
									void handleSendRemoteCommand("setVolume", { volume: 0.2 })
								}
							>
								Volume 20%
							</Button>
							<Button
								variant="secondary"
								class="h-10"
								onClick={() =>
									void handleSendRemoteCommand("setVolume", { volume: 0.8 })
								}
							>
								Volume 80%
							</Button>
							<Button
								variant="secondary"
								class="h-10"
								onClick={() => void handleSendRemoteCommand("toggleShuffle")}
							>
								Shuffle
							</Button>
							<Button
								variant="secondary"
								class="h-10"
								onClick={() =>
									void handleSendRemoteCommand("setRepeat", {
										mode:
											snapshot()?.repeat === "all"
												? "one"
												: snapshot()?.repeat === "one"
													? "off"
													: "all",
									})
								}
							>
								Repeat
							</Button>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<Label>Seek</Label>
								<span class="text-muted-foreground">
									{formatDurationMs(effectiveSeekMs())} /{" "}
									{formatDurationMs(durationMs())}
								</span>
							</div>
							<Slider
								value={[effectiveSeekMs()]}
								minValue={0}
								maxValue={Math.max(durationMs(), 1)}
								step={1000}
								onChange={(value) => setSeekDraftMs(value[0] ?? 0)}
								onChangeEnd={handleSeekCommit}
							>
								<SliderTrack class="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
									<SliderFill class="absolute h-full bg-primary" />
								</SliderTrack>
								<SliderThumb class="block h-4 w-4 rounded-full border-2 border-primary bg-background" />
							</Slider>
							<div class="hidden grid-cols-2 gap-2 md:grid">
								<Button
									variant="outline"
									class="h-10"
									onClick={() =>
										void handleSendRemoteCommand("seek", {
											positionMs: Math.max(0, currentTimeMs() - 10_000),
										})
									}
								>
									-10s
								</Button>
								<Button
									variant="outline"
									class="h-10"
									onClick={() =>
										void handleSendRemoteCommand("seek", {
											positionMs: Math.min(
												durationMs(),
												currentTimeMs() + 10_000,
											),
										})
									}
								>
									+10s
								</Button>
							</div>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<Label>Queue Position</Label>
								<span class="text-muted-foreground">
									{currentQueueIndex() >= 0
										? `${currentQueueIndex() + 1} / ${queueLength()}`
										: "-"}
								</span>
							</div>
							<div class="grid grid-cols-2 gap-2">
								<Button
									variant="outline"
									class="h-10"
									disabled={currentQueueIndex() <= 0}
									onClick={() =>
										void handleSendRemoteCommand("setQueueIndex", {
											index: currentQueueIndex() - 1,
										})
									}
								>
									Prev Track
								</Button>
								<Button
									variant="outline"
									class="h-10"
									disabled={
										currentQueueIndex() < 0 ||
										currentQueueIndex() >= queueLength() - 1
									}
									onClick={() =>
										void handleSendRemoteCommand("setQueueIndex", {
											index: currentQueueIndex() + 1,
										})
									}
								>
									Next Track
								</Button>
							</div>
							<div class="flex flex-col gap-2 sm:flex-row">
								<Input
									class="h-11"
									type="number"
									inputmode="numeric"
									value={queueIndexInput()}
									onInput={(event) =>
										setQueueIndexInput(event.currentTarget.value)
									}
									placeholder="Track #"
								/>
								<Button
									variant="secondary"
									class="h-11 w-full sm:w-auto"
									onClick={handleQueueJump}
									disabled={queueLength() === 0}
								>
									Go
								</Button>
							</div>
						</div>

						<div class="space-y-1 text-sm">
							<p class="font-medium">Now Playing</p>
							<p class="text-muted-foreground break-words">
								{snapshot()?.currentTrack
									? `${snapshot()?.currentTrack?.title ?? "Unknown"} - ${snapshot()?.currentTrack?.artist ?? "Unknown artist"}`
									: "No track information"}
							</p>
							<p class="text-xs text-muted-foreground">
								Playback: {snapshot()?.isPlaying ? "Playing" : "Paused"}
							</p>
							<p class="text-xs text-muted-foreground">
								Repeat: {snapshot()?.repeat ?? "off"}
							</p>
							<p class="text-xs text-muted-foreground">
								State updated: {remoteState()?.updatedAt ?? "-"}
							</p>
						</div>

						<div class="sticky bottom-0 rounded-2xl bg-background/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur md:hidden">
							<div class="grid grid-cols-5 gap-1.5">
								<Button
									variant="outline"
									class="h-12 gap-0 px-0 text-[11px] min-[360px]:gap-1"
									aria-label="Previous track"
									onClick={() => void handleSendRemoteCommand("previous")}
								>
									<IconPlayerSkipBackFilled class="size-4" />
									<span class="hidden min-[360px]:inline">Prev</span>
								</Button>
								<Button
									variant="outline"
									class="h-12 gap-0 px-0 text-[11px] min-[360px]:gap-1"
									aria-label="Rewind 10 seconds"
									onClick={() =>
										void handleSendRemoteCommand("seek", {
											positionMs: Math.max(0, currentTimeMs() - 10_000),
										})
									}
								>
									<IconRewindBackward10 class="size-4" />
									<span class="hidden min-[360px]:inline">-10s</span>
								</Button>
								<Button
									class="h-12 gap-0 min-[360px]:gap-1"
									aria-label={snapshot()?.isPlaying ? "Pause" : "Play"}
									onClick={() =>
										void handleSendRemoteCommand("togglePlayPause")
									}
								>
									<Show
										when={snapshot()?.isPlaying}
										fallback={<IconPlayerPlayFilled class="size-4" />}
									>
										<IconPlayerPauseFilled class="size-4" />
									</Show>
									<span class="hidden min-[360px]:inline">
										{snapshot()?.isPlaying ? "Pause" : "Play"}
									</span>
								</Button>
								<Button
									variant="outline"
									class="h-12 gap-0 px-0 text-[11px] min-[360px]:gap-1"
									aria-label="Forward 10 seconds"
									onClick={() =>
										void handleSendRemoteCommand("seek", {
											positionMs: Math.min(
												durationMs(),
												currentTimeMs() + 10_000,
											),
										})
									}
								>
									<IconRewindForward10 class="size-4" />
									<span class="hidden min-[360px]:inline">+10s</span>
								</Button>
								<Button
									variant="outline"
									class="h-12 gap-0 px-0 text-[11px] min-[360px]:gap-1"
									aria-label="Next track"
									onClick={() => void handleSendRemoteCommand("next")}
								>
									<IconPlayerSkipForwardFilled class="size-4" />
									<span class="hidden min-[360px]:inline">Next</span>
								</Button>
							</div>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
}
