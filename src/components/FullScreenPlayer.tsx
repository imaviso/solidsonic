import {
	IconArrowDown,
	IconArrowsShuffle,
	IconArrowUp,
	IconChevronDown,
	IconList,
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
	IconPlayerSkipBackFilled,
	IconPlayerSkipForwardFilled,
	IconQuote,
	IconRepeat,
	IconRepeatOnce,
	IconTrash,
	IconVolume,
	IconVolume2,
	IconVolume3,
} from "@tabler/icons-solidjs";
import { createQuery } from "@tanstack/solid-query";
import { Link } from "@tanstack/solid-router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import CoverArt from "~/components/CoverArt";
import { Button } from "~/components/ui/button";
import {
	Slider,
	SliderFill,
	SliderThumb,
	SliderTrack,
} from "~/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	getLyrics,
	getLyricsBySongId,
	type Lyrics,
	type StructuredLyrics,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";
import { cn, handleVolumeScroll } from "~/lib/utils";

interface FullScreenPlayerProps {
	isOpen: boolean;
	onClose: () => void;
}

function formatTime(seconds: number) {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type ViewMode = "artwork" | "lyrics" | "queue";

const LyricsView: Component = () => {
	const player = usePlayer();
	let scrollRef: HTMLDivElement | undefined;
	const [userScrolled, setUserScrolled] = createSignal(false);
	let scrollTimeout: NodeJS.Timeout;

	const lyricsQuery = createQuery(() => ({
		queryKey: ["lyrics", player.currentTrack?.id],
		queryFn: async () => {
			if (!player.currentTrack) return null;
			// Try structured lyrics first
			try {
				const structured = await getLyricsBySongId(player.currentTrack.id);
				if (structured && structured.length > 0) {
					// Only treat as "synced" if the flag is true
					if (structured[0].synced) {
						return { type: "synced", data: structured[0] } as const;
					}
					// Otherwise, render these lines as static text
					return { type: "unsynced", data: structured[0] } as const;
				}
			} catch (_e) {
				// ignore
			}

			// Fallback to plain lyrics
			try {
				const plain = await getLyrics(
					player.currentTrack.artist || "",
					player.currentTrack.title,
				);
				if (plain) {
					return { type: "plain", data: plain } as const;
				}
			} catch (_e) {
				// ignore
			}
			return null;
		},
		enabled: !!player.currentTrack,
	}));

	const currentLineIndex = createMemo(() => {
		const data = lyricsQuery.data;
		if (data?.type !== "synced") return -1;

		const timeMs = player.currentTime * 1000;
		const lines = data.data.line;

		// Find the last line that started before current time
		let activeIndex = -1;
		for (let i = 0; i < lines.length; i++) {
			if ((lines[i].start || 0) <= timeMs) {
				activeIndex = i;
			} else {
				break;
			}
		}
		return activeIndex;
	});

	// Auto-scroll
	createEffect(() => {
		const index = currentLineIndex();
		if (index !== -1 && scrollRef && !userScrolled()) {
			const activeEl = scrollRef.children[index] as HTMLElement;
			if (activeEl) {
				activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}
	});

	const handleScroll = () => {
		setUserScrolled(true);
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => setUserScrolled(false), 3000);
	};

	onCleanup(() => {
		clearTimeout(scrollTimeout);
	});

	return (
		<div
			ref={scrollRef}
			class="h-full w-full overflow-y-auto no-scrollbar flex flex-col items-center py-[50%] space-y-8 text-center"
			style={{
				"mask-image":
					"linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
			}}
			onScroll={handleScroll}
		>
			<Show when={lyricsQuery.isLoading}>
				<div class="animate-pulse flex flex-col gap-6 items-center opacity-50">
					<div class="h-8 w-64 bg-muted/40 rounded-full" />
					<div class="h-8 w-96 bg-muted/40 rounded-full" />
					<div class="h-8 w-80 bg-muted/40 rounded-full" />
				</div>
			</Show>

			<Show
				when={lyricsQuery.data}
				fallback={
					!lyricsQuery.isLoading && (
						<div class="flex flex-col items-center justify-center gap-4 text-muted-foreground/50">
							<IconQuote class="size-12 opacity-50" />
							<div class="text-2xl font-semibold">No lyrics available</div>
						</div>
					)
				}
			>
				{(lyrics) => (
					<Show
						when={lyrics().type === "synced"}
						fallback={
							<div class="whitespace-pre-wrap text-xl md:text-2xl lg:text-3xl font-bold leading-loose text-foreground/90 max-w-3xl px-8">
								{lyrics().type === "unsynced"
									? (lyrics().data as StructuredLyrics).line
											.map((l) => l.value)
											.join("\n")
									: (lyrics().data as Lyrics).value ||
										(lyrics().data as Lyrics).lyrics
											?.map((l) => l.value)
											.join("\n")}
							</div>
						}
					>
						<For each={(lyrics().data as StructuredLyrics).line}>
							{(line, i) => (
								<button
									type="button"
									class={cn(
										"text-2xl md:text-3xl lg:text-5xl font-bold transition-all duration-700 cursor-pointer px-8 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg w-full text-center bg-transparent border-0 select-none",
										i() === currentLineIndex()
											? "text-primary scale-100 opacity-100 blur-0"
											: "text-muted-foreground/40 scale-95 opacity-40 blur-[2px] hover:opacity-70 hover:blur-0",
									)}
									onClick={() => {
										if (line.start) {
											player.seek(line.start / 1000);
										}
									}}
								>
									{line.value}
								</button>
							)}
						</For>
					</Show>
				)}
			</Show>
		</div>
	);
};

const QueueView: Component = () => {
	const player = usePlayer();
	let activeRef: HTMLDivElement | undefined;

	onMount(() => {
		if (activeRef) {
			activeRef.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	});

	return (
		<div
			class="h-full w-full overflow-y-auto p-4 space-y-1 no-scrollbar"
			style={{
				"mask-image":
					"linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
			}}
		>
			<For each={player.queue}>
				{(song, i) => (
					<div
						ref={(el) => {
							if (i() === player.queueIndex) activeRef = el;
						}}
						class={cn(
							"group flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
							i() === player.queueIndex && "bg-muted/30",
						)}
					>
						{/* biome-ignore lint/a11y: content contains interactive elements */}
						<div
							role="button"
							tabIndex={0}
							class="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer outline-none"
							onClick={() => player.playSong(song, player.queue, i())}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									player.playSong(song, player.queue, i());
								}
							}}
						>
							<div class="relative size-12 flex-none rounded overflow-hidden shadow-sm">
								<CoverArt
									id={song.coverArt}
									class="w-full h-full object-cover"
								/>
								<Show when={i() === player.queueIndex}>
									<div class="absolute inset-0 bg-black/40 flex items-center justify-center">
										<div class="playing-indicator space-x-[2px] flex items-end h-4">
											<div class="w-[3px] bg-primary animate-music-bar-1 h-full" />
											<div class="w-[3px] bg-primary animate-music-bar-2 h-full" />
											<div class="w-[3px] bg-primary animate-music-bar-3 h-full" />
										</div>
									</div>
								</Show>
							</div>
							<div class="flex-1 min-w-0">
								<div
									class={cn(
										"font-medium truncate text-base",
										i() === player.queueIndex && "text-primary",
									)}
								>
									{song.title}
								</div>
								<div class="text-sm text-muted-foreground truncate">
									<Show
										when={song.artistId}
										fallback={song.artist ?? "Unknown Artist"}
									>
										<Link
											to="/app/artists/$id"
											params={{ id: song.artistId ?? "" }}
											class="hover:underline hover:text-foreground relative z-10"
											onClick={(e) => e.stopPropagation()}
										>
											{song.artist}
										</Link>
									</Show>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
							<div class="text-xs text-muted-foreground font-mono mr-2">
								{formatTime(song.duration || 0)}
							</div>
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="ghost"
										size="icon"
										class="size-8 text-muted-foreground hover:text-foreground"
										onClick={(e) => {
											e.stopPropagation();
											player.moveInQueue(i(), i() - 1);
										}}
										disabled={i() === 0}
									>
										<IconArrowUp class="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Move Up</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="ghost"
										size="icon"
										class="size-8 text-muted-foreground hover:text-foreground"
										onClick={(e) => {
											e.stopPropagation();
											player.moveInQueue(i(), i() + 1);
										}}
										disabled={i() === player.queue.length - 1}
									>
										<IconArrowDown class="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Move Down</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="ghost"
										size="icon"
										class="size-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
										onClick={(e) => {
											e.stopPropagation();
											player.removeFromQueue(i());
										}}
										disabled={i() === player.queueIndex}
									>
										<IconTrash class="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Remove</TooltipContent>
							</Tooltip>
						</div>
					</div>
				)}
			</For>
		</div>
	);
};

const FullScreenPlayer: Component<FullScreenPlayerProps> = (props) => {
	const player = usePlayer();
	const [isSeeking, setIsSeeking] = createSignal(false);
	const [seekValue, setSeekValue] = createSignal(0);
	const [view, setView] = createSignal<ViewMode>("artwork");

	// Reset view when closing
	createEffect(() => {
		if (!props.isOpen) {
			// Optional: reset to artwork after delay?
			// setTimeout(() => setView("artwork"), 500)
		}
	});

	// Sync seek value
	createEffect(() => {
		if (!isSeeking()) {
			setSeekValue(player.currentTime);
		}
	});

	const handleSeekCommit = (value: number[]) => {
		setIsSeeking(false);
		player.seek(value[0]);
	};

	const handleSeekChange = (value: number[]) => {
		setIsSeeking(true);
		setSeekValue(value[0]);
	};

	const handleVolumeWheel = (e: WheelEvent) => {
		handleVolumeScroll(e, player.volume, player.setVolume);
	};

	return (
		<Portal>
			<div
				class={cn(
					"fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
					props.isOpen
						? "translate-y-0 opacity-100"
						: "translate-y-full opacity-0 pointer-events-none",
				)}
			>
				{/* Dynamic Background */}
				<div class="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none transition-opacity duration-1000">
					<Show when={!!player.currentTrack}>
						<CoverArt
							id={player.currentTrack?.coverArt}
							class="w-full h-full object-cover blur-3xl scale-150 animate-pulse-slow"
						/>
					</Show>
					<div class="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
				</div>

				{/* Content Container */}
				<div class="relative z-10 flex flex-col h-full max-w-7xl mx-auto p-6 lg:p-10">
					{/* Header */}
					<div class="flex items-center justify-between flex-none">
						<Button
							variant="ghost"
							size="icon"
							class="rounded-full"
							onClick={props.onClose}
						>
							<IconChevronDown class="size-6" />
						</Button>
						<div class="flex bg-muted/20 rounded-full p-1">
							<Button
								variant={view() === "artwork" ? "secondary" : "ghost"}
								size="sm"
								class="rounded-full h-8 px-4 text-xs font-medium"
								onClick={() => setView("artwork")}
							>
								Playing
							</Button>
							<Button
								variant={view() === "lyrics" ? "secondary" : "ghost"}
								size="sm"
								class="rounded-full h-8 px-4 text-xs font-medium"
								onClick={() => setView("lyrics")}
							>
								Lyrics
							</Button>
							<Button
								variant={view() === "queue" ? "secondary" : "ghost"}
								size="sm"
								class="rounded-full h-8 px-4 text-xs font-medium"
								onClick={() => setView("queue")}
							>
								Up Next
							</Button>
						</div>
						<div class="w-10" /> {/* Spacer for centering */}
					</div>

					{/* Main Content Area */}
					<div class="flex-1 flex flex-col lg:landscape:flex-row items-center justify-center gap-10 lg:gap-20 min-h-0 py-8">
						{/* Left Side: Artwork / Content */}
						<div
							class={cn(
								"relative w-full max-w-[500px] md:max-w-[600px] lg:landscape:max-w-[500px] portrait:max-w-[80vw]",
								"h-[300px] md:h-[450px] lg:h-[500px] portrait:h-[60vh] portrait:max-h-[800px]",
								"transition-all duration-500 flex items-center justify-center overflow-hidden rounded-2xl",
								view() === "artwork" ? "scale-100" : "scale-100",
							)}
						>
							{/* Artwork View */}

							<div
								class={cn(
									"absolute inset-0 transition-all duration-500 flex items-center justify-center",
									view() === "artwork"
										? "opacity-100 scale-100 translate-y-0"
										: "opacity-0 scale-90 translate-y-10 pointer-events-none",
								)}
							>
								<div class="aspect-square w-full max-h-full rounded-xl overflow-hidden bg-muted shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
									<CoverArt
										id={player.currentTrack?.coverArt}
										class="w-full h-full object-cover"
									/>
								</div>
							</div>

							{/* Lyrics View */}
							<div
								class={cn(
									"absolute inset-0 transition-all duration-500",
									view() === "lyrics"
										? "opacity-100 translate-x-0"
										: view() === "artwork"
											? "opacity-0 translate-x-10 pointer-events-none"
											: "opacity-0 -translate-x-10 pointer-events-none",
								)}
							>
								<LyricsView />
							</div>

							{/* Queue View */}
							<div
								class={cn(
									"absolute inset-0 transition-all duration-500",
									view() === "queue"
										? "opacity-100 translate-x-0"
										: "opacity-0 translate-x-10 pointer-events-none",
								)}
							>
								<QueueView />
							</div>
						</div>

						{/* Right Side: Controls (Desktop) or Below (Mobile) */}
						<div class="flex flex-col w-full max-w-md md:max-w-2xl lg:landscape:max-w-md gap-6 lg:gap-8">
							{/* Track Info */}
							<div class="space-y-1 text-center lg:landscape:text-left">
								<h2 class="text-2xl md:text-3xl font-bold leading-tight line-clamp-2">
									{player.currentTrack?.title ?? "Not Playing"}
								</h2>
								<h3 class="text-lg md:text-xl text-muted-foreground font-medium line-clamp-1">
									<Show
										when={player.currentTrack?.artistId}
										fallback={player.currentTrack?.artist ?? "Select a song"}
									>
										<Link
											to="/app/artists/$id"
											params={{ id: player.currentTrack?.artistId ?? "" }}
											class="hover:underline hover:text-foreground"
											onClick={() => props.onClose()}
										>
											{player.currentTrack?.artist}
										</Link>
									</Show>
								</h3>
								<p class="text-sm text-muted-foreground/60 line-clamp-1">
									<Show
										when={player.currentTrack?.albumId}
										fallback={player.currentTrack?.album}
									>
										<Link
											to="/app/albums/$id"
											params={{ id: player.currentTrack?.albumId ?? "" }}
											class="hover:underline hover:text-foreground"
											onClick={() => props.onClose()}
										>
											{player.currentTrack?.album}
										</Link>
									</Show>
								</p>
							</div>

							{/* Progress Bar */}
							<div class="space-y-2 group">
								<Slider
									value={[seekValue()]}
									minValue={0}
									maxValue={player.duration || 100}
									onChange={handleSeekChange}
									onChangeEnd={handleSeekCommit}
									class="w-full cursor-pointer"
								>
									<SliderTrack class="h-1.5 bg-primary/20 group-hover:h-2 transition-all rounded-full overflow-hidden">
										<SliderFill class="bg-primary/80 group-hover:bg-primary transition-colors" />
									</SliderTrack>
									<SliderThumb class="size-3 group-hover:size-4 transition-all opacity-0 group-hover:opacity-100 border-2 border-primary bg-background ring-offset-background top-[-3px] group-hover:top-[-4px]" />
								</Slider>
								<div class="flex justify-between text-xs font-medium text-muted-foreground">
									<span>{formatTime(seekValue())}</span>
									<span>{formatTime(player.duration)}</span>
								</div>
							</div>

							{/* Playback Controls */}
							<div class="flex items-center justify-center lg:landscape:justify-between gap-6">
								<Button
									variant="ghost"
									size="icon"
									class={cn(
										"size-10 text-muted-foreground hover:text-foreground",
										player.shuffle && "text-primary",
									)}
									onClick={player.toggleShuffle}
								>
									<IconArrowsShuffle class="size-5" />
								</Button>

								<div class="flex items-center gap-6">
									<Button
										variant="ghost"
										size="icon"
										class="size-12 hover:scale-110 transition-transform"
										onClick={player.playPrevious}
									>
										<IconPlayerSkipBackFilled class="size-8" />
									</Button>
									<Button
										size="icon"
										class="size-16 rounded-full hover:scale-105 transition-transform shadow-lg"
										onClick={player.togglePlayPause}
									>
										<Show
											when={player.isPlaying}
											fallback={<IconPlayerPlayFilled class="size-8" />}
										>
											<IconPlayerPauseFilled class="size-8" />
										</Show>
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="size-12 hover:scale-110 transition-transform"
										onClick={player.playNext}
									>
										<IconPlayerSkipForwardFilled class="size-8" />
									</Button>
								</div>

								<Button
									variant="ghost"
									size="icon"
									class={cn(
										"size-10 text-muted-foreground hover:text-foreground",
										player.repeat !== "off" && "text-primary",
									)}
									onClick={player.toggleRepeat}
								>
									<Show
										when={player.repeat === "one"}
										fallback={<IconRepeat class="size-5" />}
									>
										<IconRepeatOnce class="size-5" />
									</Show>
								</Button>
							</div>

							{/* Bottom Actions (Volume/Queue) */}
							<div class="flex items-center justify-between pt-4">
								<div
									class="flex items-center gap-3 w-full max-w-[140px]"
									onWheel={handleVolumeWheel}
								>
									<Button
										variant="ghost"
										size="icon"
										class="size-8 p-0"
										onClick={() =>
											player.setVolume(player.volume === 0 ? 1 : 0)
										}
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
										value={[player.volume]}
										minValue={0}
										maxValue={1}
										step={0.01}
										class="flex-1 cursor-pointer"
										onChange={(val) => player.setVolume(val[0])}
									>
										<SliderTrack class="h-1 bg-primary/20 rounded-full overflow-hidden">
											<SliderFill class="bg-primary" />
										</SliderTrack>
										<SliderThumb class="size-3 border-primary bg-background shadow-sm top-[-4px]" />
									</Slider>
								</div>
								<div class="flex items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										class={cn(
											"text-muted-foreground",
											view() === "lyrics" && "text-primary bg-muted",
										)}
										onClick={() =>
											setView(view() === "lyrics" ? "artwork" : "lyrics")
										}
									>
										<IconQuote class="size-5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class={cn(
											"text-muted-foreground",
											view() === "queue" && "text-primary bg-muted",
										)}
										onClick={() =>
											setView(view() === "queue" ? "artwork" : "queue")
										}
									>
										<IconList class="size-5" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Portal>
	);
};

export default FullScreenPlayer;
