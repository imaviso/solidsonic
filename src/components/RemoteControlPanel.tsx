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
	getRemoteHostSessionId,
	getRemoteHostSyncStatus,
	type RemoteHostSyncStatus,
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
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-sm font-medium">Host This Player</h3>
					<Show
						when={hostSession()}
						fallback={
							<Button onClick={handleCreateRemoteSession}>Start Host</Button>
						}
					>
						<Button variant="destructive" onClick={handleStopRemoteHost}>
							Stop Host
						</Button>
					</Show>
				</div>

				<Show when={hostSession()}>
					<div class="space-y-2 rounded-md border p-3">
						<p class="text-sm text-muted-foreground">Pairing code</p>
						<p class="text-2xl font-mono tracking-widest">
							{hostSession()?.pairingCode ?? "(joined)"}
						</p>
						<p class="text-xs text-muted-foreground">
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
				<div class="flex gap-2">
					<Input
						value={joinCode()}
						onInput={(event) => setJoinCode(event.currentTarget.value)}
						placeholder="Enter 6-digit code"
					/>
					<Button onClick={handleJoinRemoteSession}>Join</Button>
				</div>

				<Show when={controllerSession()}>
					<div class="space-y-4 rounded-md border p-3 pb-20 md:pb-3">
						<div class="flex items-center justify-between">
							<p class="text-sm font-medium">Controller Connected</p>
							<Button variant="outline" onClick={handleLeaveControllerSession}>
								Leave
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Session expires in: {controllerExpiresIn()}
						</p>

						<div class="grid grid-cols-2 gap-2 md:grid-cols-5">
							<Button
								variant="outline"
								onClick={() => void handleSendRemoteCommand("play")}
							>
								Play
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendRemoteCommand("pause")}
							>
								Pause
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendRemoteCommand("previous")}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendRemoteCommand("togglePlayPause")}
							>
								Play/Pause
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendRemoteCommand("next")}
							>
								Next
							</Button>
						</div>

						<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
							<Button
								variant="secondary"
								onClick={() =>
									void handleSendRemoteCommand("setVolume", { volume: 0.2 })
								}
							>
								Volume 20%
							</Button>
							<Button
								variant="secondary"
								onClick={() =>
									void handleSendRemoteCommand("setVolume", { volume: 0.8 })
								}
							>
								Volume 80%
							</Button>
							<Button
								variant="secondary"
								onClick={() => void handleSendRemoteCommand("toggleShuffle")}
							>
								Shuffle
							</Button>
							<Button
								variant="secondary"
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
							<div class="grid grid-cols-2 gap-2">
								<Button
									variant="outline"
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
							<div class="flex gap-2">
								<Button
									variant="outline"
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
							<div class="flex gap-2">
								<Input
									type="number"
									value={queueIndexInput()}
									onInput={(event) =>
										setQueueIndexInput(event.currentTarget.value)
									}
									placeholder="Track #"
								/>
								<Button
									variant="secondary"
									onClick={handleQueueJump}
									disabled={queueLength() === 0}
								>
									Go
								</Button>
							</div>
						</div>

						<div class="space-y-1 text-sm">
							<p class="font-medium">Now Playing</p>
							<p class="text-muted-foreground">
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

						<div class="sticky bottom-2 rounded-md border bg-background/95 p-2 backdrop-blur md:hidden">
							<div class="grid grid-cols-3 gap-2">
								<Button
									variant="outline"
									class="h-12"
									onClick={() => void handleSendRemoteCommand("previous")}
								>
									Prev
								</Button>
								<Button
									class="h-12"
									onClick={() =>
										void handleSendRemoteCommand("togglePlayPause")
									}
								>
									{snapshot()?.isPlaying ? "Pause" : "Play"}
								</Button>
								<Button
									variant="outline"
									class="h-12"
									onClick={() => void handleSendRemoteCommand("next")}
								>
									Next
								</Button>
							</div>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
}
