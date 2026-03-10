import {
	IconArrowsShuffle,
	IconMusic,
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
	IconPlayerSkipBackFilled,
	IconPlayerSkipForwardFilled,
	IconRepeat,
	IconRepeatOnce,
	IconVolume,
	IconVolume2,
	IconVolume3,
} from "@tabler/icons-solidjs";
import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import CoverArt from "~/components/CoverArt";
import { Button } from "~/components/ui/button";
import {
	Slider,
	SliderFill,
	SliderThumb,
	SliderTrack,
} from "~/components/ui/slider";
import { usePlayer } from "~/lib/player";
import { cn, handleVolumeScroll } from "~/lib/utils";
import FullScreenPlayer from "./FullScreenPlayer";

function formatTime(seconds: number) {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const Player: Component = () => {
	const player = usePlayer();
	const [isFullScreen, setIsFullScreen] = createSignal(false);

	// Local state for dragging slider to prevent jumpy UI
	const [isSeeking, setIsSeeking] = createSignal(false);
	const [seekValue, setSeekValue] = createSignal(0);

	// Local state for volume dragging
	const [isChangingVolume, setIsChangingVolume] = createSignal(false);
	const [volumeValue, setVolumeValue] = createSignal(1);

	// Sync volume with player state when not changing
	createEffect(() => {
		if (!isChangingVolume()) {
			setVolumeValue(player.volume);
		}
	});

	// Sync seek value with player state when not seeking
	createEffect(() => {
		if (!isSeeking()) {
			setSeekValue(player.currentTime);
		}
	});

	// Global keyboard shortcuts
	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if typing in an input/textarea
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (e.code) {
				case "Space":
					e.preventDefault();
					player.togglePlayPause();
					break;
				case "MediaPlayPause":
					e.preventDefault();
					player.togglePlayPause();
					break;
				case "MediaTrackNext":
					e.preventDefault();
					player.playNext();
					break;
				case "MediaTrackPrevious":
					e.preventDefault();
					player.playPrevious();
					break;
				case "Escape":
					if (isFullScreen()) setIsFullScreen(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
	});

	const handleSeekCommit = (value: number[]) => {
		setIsSeeking(false);
		player.seek(value[0]);
	};

	const handleSeekChange = (value: number[]) => {
		setIsSeeking(true);
		setSeekValue(value[0]);
	};

	const handleVolumeCommit = (value: number[]) => {
		setIsChangingVolume(false);
		player.setVolume(value[0]);
	};

	const handleVolumeChange = (value: number[]) => {
		setIsChangingVolume(true);
		setVolumeValue(value[0]);
		player.setVolume(value[0]); // Update live while dragging
	};

	return (
		<>
			<FullScreenPlayer
				isOpen={isFullScreen()}
				onClose={() => setIsFullScreen(false)}
			/>
			<div class="shell-divider border-t border-border bg-background px-2 py-2 md:px-4 md:py-3">
				<div class="panel-surface grid min-h-[92px] gap-3 border border-border bg-background/90 p-3 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,1fr)_minmax(220px,0.72fr)] md:items-center md:px-4">
					{/* Track Info */}
					<div class="group flex min-w-0 items-center gap-3 border-b border-border/60 pb-3 text-left md:border-b-0 md:border-r md:pb-0 md:pr-4">
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => setIsFullScreen(true)}
						>
							<div class="relative shrink-0">
								<div class="flex aspect-square size-12 items-center justify-center overflow-hidden border border-border bg-muted transition-transform group-hover:scale-[1.03] md:size-14">
									<Show
										when={!!player.currentTrack}
										fallback={
											<IconMusic class="size-5 text-muted-foreground md:size-6" />
										}
									>
										<CoverArt
											id={player.currentTrack?.coverArt}
											class="h-full w-full"
										/>
									</Show>
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<p class="panel-heading mb-1 text-muted-foreground/80">
									Now Playing
								</p>
								<p class="truncate text-sm font-semibold text-foreground group-hover:underline md:text-base">
									{player.currentTrack?.title ?? "Not Playing"}
								</p>
								<p class="truncate text-sm text-muted-foreground">
									{player.currentTrack?.artist ??
										"Select a song to start playback"}
									<Show when={player.currentTrack?.album}>
										<span class="mx-1 text-muted-foreground/70">-</span>
										<span class="truncate">{player.currentTrack?.album}</span>
									</Show>
								</p>
							</div>
						</button>
						<Button
							variant="ghost"
							size="icon"
							class="size-11 shrink-0 border border-border md:hidden"
							aria-label={player.isPlaying ? "Pause" : "Play"}
							onClick={(e) => {
								e.stopPropagation();
								player.togglePlayPause();
							}}
							disabled={!player.currentTrack}
						>
							<Show
								when={player.isPlaying}
								fallback={<IconPlayerPlayFilled class="size-5" />}
							>
								<IconPlayerPauseFilled class="size-5" />
							</Show>
						</Button>
					</div>

					<div class="flex min-w-0 flex-col justify-center gap-3 md:px-2">
						<div class="hidden items-center justify-center gap-1 md:flex">
							<Button
								variant="ghost"
								size="icon"
								class={cn(
									"size-11",
									player.shuffle &&
										"border border-border bg-accent text-primary",
								)}
								aria-label="Toggle Shuffle"
								onClick={player.toggleShuffle}
							>
								<IconArrowsShuffle class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-11"
								aria-label="Previous Track"
								onClick={player.playPrevious}
							>
								<IconPlayerSkipBackFilled class="size-4" />
							</Button>
							<Button
								size="icon"
								class="size-12"
								aria-label={player.isPlaying ? "Pause" : "Play"}
								onClick={player.togglePlayPause}
								disabled={!player.currentTrack}
							>
								<Show
									when={player.isPlaying}
									fallback={<IconPlayerPlayFilled class="size-4" />}
								>
									<IconPlayerPauseFilled class="size-4" />
								</Show>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-11"
								aria-label="Next Track"
								onClick={player.playNext}
							>
								<IconPlayerSkipForwardFilled class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class={cn(
									"size-11",
									player.repeat !== "off" &&
										"border border-border bg-accent text-primary",
								)}
								aria-label="Toggle Repeat"
								onClick={player.toggleRepeat}
							>
								<Show
									when={player.repeat === "one"}
									fallback={<IconRepeat class="size-4" />}
								>
									<IconRepeatOnce class="size-4" />
								</Show>
							</Button>
						</div>

						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<span class="mono-meta w-12 text-right text-muted-foreground">
								{formatTime(seekValue())}
							</span>
							<Slider
								value={[seekValue()]}
								minValue={0}
								maxValue={player.duration || 100}
								onChange={handleSeekChange}
								onChangeEnd={handleSeekCommit}
								class="flex-1"
								step={1}
								disabled={!player.currentTrack}
							>
								<SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-none bg-secondary">
									<SliderFill class="absolute h-full bg-primary" />
								</SliderTrack>
								<SliderThumb class="block h-4 w-4 rounded-none border-2 border-primary bg-primary-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
							</Slider>
							<span class="mono-meta w-12 text-left text-muted-foreground">
								{formatTime(player.duration)}
							</span>
						</div>
					</div>

					<div
						class="hidden flex-col justify-center gap-3 border-l border-border/60 pl-4 md:flex"
						onWheel={(e) => {
							e.preventDefault();
							handleVolumeScroll(e, player.volume, player.setVolume);
						}}
					>
						<div class="panel-heading text-muted-foreground/80">Output</div>
						<div class="flex items-center gap-3">
							<Button
								variant="ghost"
								size="icon"
								class="size-11 border border-border"
								aria-label={player.volume === 0 ? "Unmute" : "Mute"}
								onClick={() => player.setVolume(player.volume === 0 ? 1 : 0)}
							>
								<Show
									when={player.volume === 0}
									fallback={
										<Show
											when={player.volume < 0.5}
											fallback={<IconVolume class="size-4" />}
										>
											<IconVolume2 class="size-4" />
										</Show>
									}
								>
									<IconVolume3 class="size-4 text-muted-foreground" />
								</Show>
							</Button>
							<Slider
								value={[volumeValue()]}
								minValue={0}
								maxValue={1}
								step={0.01}
								class="flex-1"
								onChange={handleVolumeChange}
								onChangeEnd={handleVolumeCommit}
							>
								<SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-none bg-secondary">
									<SliderFill class="absolute h-full bg-primary" />
								</SliderTrack>
								<SliderThumb class="block h-4 w-4 rounded-none border-2 border-primary bg-primary-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
							</Slider>
						</div>
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span>{Math.round(volumeValue() * 100)}% volume</span>
							<span class="mono-meta text-muted-foreground/80">
								Space play/pause
							</span>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Player;
