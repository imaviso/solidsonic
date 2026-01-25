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
import { cn } from "~/lib/utils";
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
			<div class="flex h-20 shrink-0 items-center border-t bg-background px-4">
				{/* Track Info */}
				<button
					type="button"
					class="flex w-1/3 items-center gap-4 group cursor-pointer text-left focus:outline-none"
					onClick={() => setIsFullScreen(true)}
				>
					<div class="relative">
						<div class="flex aspect-square size-12 items-center justify-center rounded-md bg-muted overflow-hidden transition-transform group-hover:scale-105">
							<Show
								when={player.currentTrack}
								fallback={<IconMusic class="size-6 text-muted-foreground" />}
							>
								<CoverArt
									id={player.currentTrack?.coverArt}
									class="h-full w-full"
								/>
							</Show>
						</div>
						{/* Expand overlay hint */}
						<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
							<IconMusic class="size-4 text-white" />
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium group-hover:underline">
							<Show when={player.currentTrack} fallback="Not Playing">
								{player.currentTrack?.title}
							</Show>
						</p>
						<p class="truncate text-xs text-muted-foreground">
							<Show when={player.currentTrack} fallback="Select a song to play">
								{player.currentTrack?.artist}
							</Show>
						</p>
					</div>
				</button>

				{/* Controls */}
				<div class="flex flex-1 flex-col items-center justify-center gap-2">
					<div class="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							class={cn("h-8 w-8", player.shuffle && "text-primary")}
							onClick={player.toggleShuffle}
						>
							<IconArrowsShuffle class="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							class="h-8 w-8"
							onClick={player.playPrevious}
						>
							<IconPlayerSkipBackFilled class="size-4" />
						</Button>
						<Button
							size="icon"
							class="h-9 w-9 rounded-full"
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
							class="h-8 w-8"
							onClick={player.playNext}
						>
							<IconPlayerSkipForwardFilled class="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							class={cn("h-8 w-8", player.repeat !== "off" && "text-primary")}
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

					<div class="flex w-full max-w-md items-center gap-2 text-xs text-muted-foreground">
						<span class="w-10 text-right">{formatTime(seekValue())}</span>
						<Slider
							value={[seekValue()]}
							minValue={0}
							maxValue={player.duration || 100} // Default to 100 if 0 to avoid errors
							onChange={handleSeekChange}
							onChangeEnd={handleSeekCommit}
							class="flex-1"
							step={1}
							disabled={!player.currentTrack}
						>
							<SliderTrack class="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
								<SliderFill class="absolute h-full bg-primary" />
							</SliderTrack>
							<SliderThumb class="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
						</Slider>
						<span class="w-10 text-left">{formatTime(player.duration)}</span>
					</div>
				</div>

				{/* Volume */}
				<div
					class="flex w-1/3 justify-end items-center gap-2"
					onWheel={(e) => {
						// Prevent page scroll
						e.preventDefault();
						// Determine scroll direction: negative deltaY is scrolling up (increasing volume)
						const direction = e.deltaY < 0 ? 1 : -1;
						const step = 0.05; // 5% volume change per scroll tick
						const newVolume = Math.min(
							1,
							Math.max(0, player.volume + direction * step),
						);
						player.setVolume(newVolume);
					}}
				>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
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
						class="w-24"
						onChange={handleVolumeChange}
						onChangeEnd={handleVolumeCommit}
					>
						<SliderTrack class="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
							<SliderFill class="absolute h-full bg-primary" />
						</SliderTrack>
						<SliderThumb class="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
					</Slider>
				</div>
			</div>
		</>
	);
};

export default Player;
