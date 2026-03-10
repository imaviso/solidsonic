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
import { queryKeys } from "~/lib/query";
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
		queryKey: queryKeys.lyrics.bySong(player.currentTrack?.id ?? ""),
		queryFn: async ({ signal }) => {
			if (!player.currentTrack) return null;
			// Try structured lyrics first
			try {
				const structured = await getLyricsBySongId(
					player.currentTrack.id,
					signal,
				);
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
					signal,
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
			class="flex h-full w-full flex-col items-center overflow-y-auto px-6 py-24 text-center no-scrollbar sm:px-10"
			style={{
				"mask-image":
					"linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
			}}
			onScroll={handleScroll}
		>
			<Show when={lyricsQuery.isLoading}>
				<div class="flex animate-pulse flex-col items-center gap-5 opacity-50">
					<div class="h-8 w-64 bg-muted/40 rounded-none" />
					<div class="h-8 w-96 bg-muted/40 rounded-none" />
					<div class="h-8 w-80 bg-muted/40 rounded-none" />
				</div>
			</Show>

			<Show
				when={lyricsQuery.data}
				fallback={
					!lyricsQuery.isLoading && (
						<div class="flex flex-col items-center justify-center gap-3 text-muted-foreground/55">
							<IconQuote class="size-10 opacity-50" />
							<div class="section-title">No lyrics available</div>
						</div>
					)
				}
			>
				{(lyrics) => (
					<Show
						when={lyrics().type === "synced"}
						fallback={
							<div class="max-w-3xl whitespace-pre-wrap px-4 text-base font-medium leading-relaxed text-foreground/90 sm:px-8 sm:text-lg md:text-xl">
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
										"w-full max-w-3xl cursor-pointer select-none rounded-none border-0 bg-transparent px-4 py-2 text-center text-base font-medium transition-[color,transform,opacity] duration-500 outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:px-8 md:text-lg",
										i() === currentLineIndex()
											? "text-primary scale-100 opacity-100"
											: "text-muted-foreground/40 scale-[0.98] opacity-40 hover:opacity-70 motion-reduce:scale-100",
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
			class="h-full w-full overflow-y-auto p-4 no-scrollbar"
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
							"group flex items-center gap-3 border-b border-border/50 px-2 py-3 transition-colors hover:bg-accent/50",
							i() === player.queueIndex && "bg-accent/60",
						)}
					>
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => player.playSong(song, player.queue, i())}
						>
							<div class="relative size-12 flex-none overflow-hidden border border-border bg-muted">
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
							<div class="min-w-0 flex-1">
								<div
									class={cn(
										"truncate text-sm font-semibold md:text-base",
										i() === player.queueIndex && "text-primary",
									)}
								>
									{song.title}
								</div>
								<div class="truncate text-sm text-muted-foreground">
									{song.artist ?? "Unknown Artist"}
								</div>
							</div>
						</button>

						<div class="ml-2 flex items-center gap-1 opacity-100 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
							<div class="mono-meta mr-2 text-muted-foreground">
								{formatTime(song.duration || 0)}
							</div>
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="ghost"
										size="icon"
										class="size-11 md:size-9 text-muted-foreground hover:text-foreground"
										aria-label="Move Up"
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
										class="size-11 md:size-9 text-muted-foreground hover:text-foreground"
										aria-label="Move Down"
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
										class="size-11 md:size-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
										aria-label="Remove from Queue"
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
					"fixed inset-0 z-[100] bg-background/95 backdrop-blur-md transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
					props.isOpen
						? "translate-y-0 opacity-100"
						: "translate-y-full opacity-0 pointer-events-none",
				)}
			>
				{/* Dynamic Background */}
				<div class="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none transition-opacity duration-1000">
					<Show when={!!player.currentTrack}>
						<CoverArt
							id={player.currentTrack?.coverArt}
							class="w-full h-full object-cover blur-3xl scale-125 saturate-125"
						/>
					</Show>
					<div class="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.84),hsl(var(--background)/0.96))]" />
				</div>

				{/* Content Container */}
				<div class="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col p-3 sm:p-4 lg:p-6">
					{/* Header */}
					<div class="panel-surface flex flex-none flex-wrap items-center justify-between gap-3 border border-border bg-background/80 px-3 py-3 sm:px-4">
						<Button
							variant="ghost"
							size="icon"
							class="size-11 sm:size-10 rounded-none border border-border"
							aria-label="Close"
							onClick={props.onClose}
						>
							<IconChevronDown class="size-6" />
						</Button>
						<div class="min-w-0 flex-1 px-1 text-center sm:text-left">
							<div class="panel-heading mb-1">Expanded Player</div>
							<div class="text-sm text-muted-foreground">
								Switch between artwork, lyrics, and queue without leaving
								playback.
							</div>
						</div>
						<div class="flex max-w-full flex-wrap justify-center gap-1 border border-border bg-background p-1">
							<Button
								variant={view() === "artwork" ? "secondary" : "ghost"}
								size="sm"
								class="h-11 rounded-none px-3 text-[0.68rem] sm:h-11 sm:px-4"
								onClick={() => setView("artwork")}
							>
								Playing
							</Button>
							<Button
								variant={view() === "lyrics" ? "secondary" : "ghost"}
								size="sm"
								class="h-11 rounded-none px-3 text-[0.68rem] sm:h-11 sm:px-4"
								onClick={() => setView("lyrics")}
							>
								Lyrics
							</Button>
							<Button
								variant={view() === "queue" ? "secondary" : "ghost"}
								size="sm"
								class="h-11 rounded-none px-3 text-[0.68rem] sm:h-11 sm:px-4"
								onClick={() => setView("queue")}
							>
								Up Next
							</Button>
						</div>
					</div>

					{/* Main Content Area */}
					<div class="grid min-h-0 flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)] lg:items-stretch lg:gap-5">
						{/* Left Side: Artwork / Content */}
						<div
							class={cn(
								"relative flex min-h-[320px] w-full items-center justify-center overflow-hidden rounded-none border border-border bg-background/78 p-3 sm:min-h-[420px] lg:min-h-0",
								"panel-surface transition-transform duration-500 motion-reduce:transition-none",
								view() === "artwork" ? "scale-100" : "scale-100",
							)}
						>
							{/* Artwork View */}

							<div
								class={cn(
									"absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-500 motion-reduce:transition-none",
									view() === "artwork"
										? "opacity-100 scale-100 translate-y-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
										: "pointer-events-none opacity-0 scale-90 translate-y-10 motion-reduce:translate-y-0 motion-reduce:scale-100",
								)}
							>
								<div class="aspect-square h-full max-h-full w-full overflow-hidden border border-border/50 bg-muted lg:max-h-[calc(100vh-16rem)]">
									<CoverArt
										id={player.currentTrack?.coverArt}
										class="w-full h-full object-cover"
									/>
								</div>
							</div>

							{/* Lyrics View */}
							<div
								class={cn(
									"absolute inset-0 transition-[transform,opacity] duration-500 motion-reduce:transition-none",
									view() === "lyrics"
										? "opacity-100 translate-x-0 motion-reduce:translate-x-0"
										: view() === "artwork"
											? "pointer-events-none opacity-0 translate-x-10 motion-reduce:translate-x-0"
											: "pointer-events-none opacity-0 -translate-x-10 motion-reduce:translate-x-0",
								)}
							>
								<LyricsView />
							</div>

							{/* Queue View */}
							<div
								class={cn(
									"absolute inset-0 transition-[transform,opacity] duration-500 motion-reduce:transition-none",
									view() === "queue"
										? "opacity-100 translate-x-0 motion-reduce:translate-x-0"
										: "pointer-events-none opacity-0 translate-x-10 motion-reduce:translate-x-0",
								)}
							>
								<QueueView />
							</div>
						</div>

						{/* Right Side: Controls (Desktop) or Below (Mobile) */}
						<div class="panel-surface flex min-w-0 flex-col gap-5 border border-border bg-background/78 p-4 sm:p-5">
							{/* Track Info */}
							<div class="shell-divider space-y-1 pb-4 text-center lg:text-left">
								<div class="panel-heading">Now Playing</div>
								<h2 class="page-title line-clamp-2 text-foreground">
									{player.currentTrack?.title ?? "Not Playing"}
								</h2>
								<h3 class="line-clamp-1 text-base font-semibold text-primary md:text-lg">
									<Show
										when={player.currentTrack?.artistId}
										fallback={player.currentTrack?.artist ?? "Select a song"}
									>
										<Link
											to="/app/artists/$id"
											params={{ id: player.currentTrack?.artistId ?? "" }}
											class="hover:underline hover:text-primary/80"
											onClick={() => props.onClose()}
										>
											{player.currentTrack?.artist}
										</Link>
									</Show>
								</h3>
								<p class="mono-meta mt-2 line-clamp-1 text-muted-foreground opacity-90">
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
									<SliderTrack class="flex h-2 items-center overflow-hidden rounded-none bg-primary/20 transition-colors">
										<SliderFill class="h-2 rounded-none bg-primary/80 transition-colors group-hover:bg-primary" />
									</SliderTrack>
									<SliderThumb class="block size-4 border-2 border-primary bg-primary-foreground opacity-100 ring-offset-background transition-transform group-hover:scale-110 motion-reduce:transition-none" />
								</Slider>
								<div class="flex justify-between text-xs text-muted-foreground">
									<span class="mono-meta">{formatTime(seekValue())}</span>
									<span class="mono-meta">{formatTime(player.duration)}</span>
								</div>
							</div>

							{/* Playback Controls */}
							<div class="panel-surface flex items-center justify-center gap-3 border border-border bg-background/70 px-2 py-2">
								<Button
									variant="ghost"
									size="icon"
									class={cn(
										"size-11 text-muted-foreground hover:text-foreground",
										player.shuffle &&
											"border border-border bg-accent text-primary",
									)}
									aria-label="Toggle Shuffle"
									onClick={player.toggleShuffle}
								>
									<IconArrowsShuffle class="size-4" />
								</Button>

								<div class="flex items-center gap-2 sm:gap-3">
									<Button
										variant="ghost"
										size="icon"
										class="size-11"
										aria-label="Previous Track"
										onClick={player.playPrevious}
									>
										<IconPlayerSkipBackFilled class="size-5" />
									</Button>
									<Button
										size="icon"
										class="size-14 rounded-none border border-border"
										aria-label={player.isPlaying ? "Pause" : "Play"}
										onClick={player.togglePlayPause}
									>
										<Show
											when={player.isPlaying}
											fallback={<IconPlayerPlayFilled class="size-5" />}
										>
											<IconPlayerPauseFilled class="size-5" />
										</Show>
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="size-11"
										aria-label="Next Track"
										onClick={player.playNext}
									>
										<IconPlayerSkipForwardFilled class="size-5" />
									</Button>
								</div>

								<Button
									variant="ghost"
									size="icon"
									class={cn(
										"size-11 text-muted-foreground hover:text-foreground",
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

							{/* Bottom Actions (Volume/Queue) */}
							<div class="grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div
									class="flex w-full items-center gap-3"
									onWheel={handleVolumeWheel}
								>
									<div class="panel-heading hidden text-muted-foreground/80 sm:block">
										Output
									</div>
									<Button
										variant="ghost"
										size="icon"
										class="size-11 border border-border p-0"
										aria-label={player.volume === 0 ? "Unmute" : "Mute"}
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
										<SliderTrack class="h-1 bg-primary/20 rounded-none overflow-hidden">
											<SliderFill class="bg-primary" />
										</SliderTrack>
										<SliderThumb class="block size-4 bg-primary-foreground border-2 border-primary transition-transform hover:scale-110" />
									</Slider>
								</div>
								<div class="flex items-center justify-end gap-2">
									<Button
										variant="ghost"
										size="icon"
										class={cn(
											"size-11 text-muted-foreground",
											view() === "lyrics" &&
												"border border-border bg-accent text-primary",
										)}
										aria-label="Toggle Lyrics View"
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
											"size-11 text-muted-foreground",
											view() === "queue" &&
												"border border-border bg-accent text-primary",
										)}
										aria-label="Toggle Queue View"
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
