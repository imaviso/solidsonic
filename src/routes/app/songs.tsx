import { IconClock, IconPlayerPlayFilled } from "@tabler/icons-solidjs";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { createEffect, createMemo, For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { getRandomSongs } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/songs")({
	component: SongsPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function SongsPage() {
	const player = usePlayer();
	let scrollContainerRef: HTMLDivElement | undefined;

	const songs = useInfiniteQuery(() => ({
		queryKey: ["songs", "random"],
		queryFn: () => getRandomSongs(50),
		initialPageParam: 0,
		getNextPageParam: (_lastPage, allPages) => {
			return allPages.length + 1;
		},
	}));

	const allSongs = createMemo(() => songs.data?.pages.flat() ?? []);

	const virtualizer = createVirtualizer({
		get count() {
			return allSongs().length;
		},
		getScrollElement: () => scrollContainerRef ?? null,
		estimateSize: () => 48, // Row height
		overscan: 10,
	});

	// Fetch more when scrolling near end
	createEffect(() => {
		const items = virtualizer.getVirtualItems();
		if (items.length === 0) return;

		const lastItem = items[items.length - 1];
		if (
			lastItem &&
			lastItem.index >= allSongs().length - 10 &&
			songs.hasNextPage &&
			!songs.isFetchingNextPage
		) {
			songs.fetchNextPage();
		}
	});

	const handlePlaySong = (index: number) => {
		const all = allSongs();
		if (all[index]) {
			player.playSong(all[index], all, index);
		}
	};

	const handlePlayAll = () => {
		const all = allSongs();
		if (all.length > 0) {
			player.playSong(all[0], all, 0);
		}
	};

	return (
		<div class="flex flex-col gap-6 h-full">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-3xl font-bold tracking-tight">Songs</h2>
					<p class="text-muted-foreground">
						Random selection from your library
					</p>
				</div>
				<Button onClick={handlePlayAll} disabled={!songs.data}>
					<IconPlayerPlayFilled class="mr-2 size-4" />
					Play All
				</Button>
			</div>

			<div ref={scrollContainerRef} class="flex-1 overflow-auto">
				{/* Header */}
				<div class="grid grid-cols-[50px_1fr_1fr_1fr_80px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border-b sticky top-0 bg-background z-10">
					<div>#</div>
					<div>Title</div>
					<div>Artist</div>
					<div>Album</div>
					<div class="text-right">
						<IconClock class="size-4 ml-auto" />
					</div>
				</div>

				<div
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative",
					}}
				>
					<For each={virtualizer.getVirtualItems()}>
						{(virtualRow) => {
							const song = allSongs()[virtualRow.index];
							if (!song) return null;

							return (
								<button
									type="button"
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: `${virtualRow.size}px`,
										transform: `translateY(${virtualRow.start}px)`,
									}}
									class="grid grid-cols-[50px_1fr_1fr_1fr_80px] gap-2 px-4 items-center group cursor-pointer hover:bg-muted/50 border-0 bg-transparent text-left"
									onClick={() => handlePlaySong(virtualRow.index)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											handlePlaySong(virtualRow.index);
										}
									}}
								>
									<div class="font-medium text-muted-foreground group-hover:text-foreground">
										<span class="group-hover:hidden">
											{virtualRow.index + 1}
										</span>
										<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
									</div>
									<div class="font-medium truncate">
										<span
											class={
												player.currentTrack?.id === song.id
													? "text-primary"
													: ""
											}
										>
											{song.title}
										</span>
									</div>
									<div class="truncate text-muted-foreground">
										{song.artist}
									</div>
									<div class="truncate text-muted-foreground">{song.album}</div>
									<div class="text-right font-mono text-xs text-muted-foreground">
										{formatDuration(song.duration)}
									</div>
								</button>
							);
						}}
					</For>
				</div>

				<Show when={songs.isLoading}>
					<div class="text-center py-4">Loading...</div>
				</Show>

				<Show when={songs.isFetchingNextPage}>
					<div class="py-4 text-center text-muted-foreground text-sm">
						Loading more...
					</div>
				</Show>
			</div>
		</div>
	);
}
