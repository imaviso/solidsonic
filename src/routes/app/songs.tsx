import {
	IconClock,
	IconDisc,
	IconList,
	IconPlayerPlay,
	IconPlayerPlayFilled,
	IconPlayerSkipForward,
	IconPlaylistAdd,
	IconStar,
	IconStarFilled,
	IconUser,
} from "@tabler/icons-solidjs";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { createEffect, createMemo, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import CoverArt from "~/components/CoverArt";
import { Button } from "~/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { getRandomSongs, type Song, star, unstar } from "~/lib/api";
import { usePlayer } from "~/lib/player";
import { queryKeys } from "~/lib/query";

export const Route = createFileRoute("/app/songs")({
	loader: ({ context: { queryClient } }) =>
		queryClient.prefetchInfiniteQuery({
			queryKey: queryKeys.songs.randomInfinite(50),
			queryFn: ({ signal }) => getRandomSongs(50, signal),
			initialPageParam: 0,
			getNextPageParam: (_lastPage: Song[], allPages: Song[][]) =>
				allPages.length + 1,
		}),
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
	const navigate = useNavigate();
	let scrollContainerRef: HTMLDivElement | undefined;
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	const songs = useInfiniteQuery(() => ({
		queryKey: queryKeys.songs.randomInfinite(50),
		queryFn: ({ signal }) => getRandomSongs(50, signal),
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
		estimateSize: () => 60, // Row height
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
			<div class="panel-surface flex flex-col gap-4 border border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
				<div>
					<div class="panel-heading mb-3">Live Queue Source</div>
					<h2 class="page-title">Songs</h2>
					<p class="mt-2 text-muted-foreground">
						Random selection from your library
					</p>
				</div>
				<Button
					class="h-11 sm:h-10 w-full sm:w-auto"
					onClick={handlePlayAll}
					disabled={!songs.data}
				>
					<IconPlayerPlayFilled class="mr-2 size-4" />
					Play All
				</Button>
			</div>

			<div
				ref={scrollContainerRef}
				class="panel-surface flex-1 overflow-auto border border-border"
			>
				{/* Header */}
				<div class="grid grid-cols-[28px_40px_minmax(0,1fr)_52px] sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs font-medium tracking-[0.08em] text-muted-foreground border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
					<div>#</div>
					<div></div>
					<div>Title</div>
					<div class="hidden md:block">Artist</div>
					<div class="hidden md:block">Album</div>
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
								<ContextMenu>
									<ContextMenuTrigger
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										<button
											type="button"
											class="w-full h-full grid grid-cols-[28px_40px_minmax(0,1fr)_52px] sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-2 sm:gap-4 px-2 sm:px-4 items-center group cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/50 bg-transparent text-left rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() => handlePlaySong(virtualRow.index)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													handlePlaySong(virtualRow.index);
												}
											}}
										>
											<div class="font-medium text-muted-foreground group-hover:text-foreground">
												<span class="group-hover:hidden text-xs">
													{virtualRow.index + 1}
												</span>
												<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
											</div>
											<CoverArt
												id={song.coverArt}
												size={80}
												class="size-10 rounded-none border border-border"
											/>
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
											<div class="truncate text-muted-foreground hidden md:block">
												<Show when={song.artistId} fallback={song.artist}>
													<Link
														to="/app/artists/$id"
														params={{ id: song.artistId ?? "" }}
														class="hover:text-foreground hover:underline"
														onClick={(e) => e.stopPropagation()}
													>
														{song.artist}
													</Link>
												</Show>
											</div>
											<div class="truncate text-muted-foreground hidden md:block">
												<Show when={song.albumId} fallback={song.album}>
													<Link
														to="/app/albums/$id"
														params={{ id: song.albumId ?? "" }}
														class="hover:text-foreground hover:underline"
														onClick={(e) => e.stopPropagation()}
													>
														{song.album}
													</Link>
												</Show>
											</div>
											<div class="text-right font-mono text-xs text-muted-foreground">
												{formatDuration(song.duration)}
											</div>
										</button>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem
											onSelect={() => handlePlaySong(virtualRow.index)}
										>
											<IconPlayerPlay class="mr-2 size-4" />
											Play
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => player.playNextInQueue(song)}
										>
											<IconPlayerSkipForward class="mr-2 size-4" />
											Play Next
										</ContextMenuItem>
										<ContextMenuItem onSelect={() => player.addToQueue([song])}>
											<IconList class="mr-2 size-4" />
											Add to Queue
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => {
												setPlaylistDialogState({
													open: true,
													songIds: [song.id],
												});
											}}
										>
											<IconPlaylistAdd class="mr-2 size-4" />
											Add to Playlist...
										</ContextMenuItem>
										<ContextMenuSeparator />
										<ContextMenuItem
											onSelect={() => {
												if (song.artistId) {
													navigate({
														to: "/app/artists/$id",
														params: { id: song.artistId },
													});
												}
											}}
											disabled={!song.artistId}
										>
											<IconUser class="mr-2 size-4" />
											Go to Artist
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => {
												if (song.albumId) {
													navigate({
														to: "/app/albums/$id",
														params: { id: song.albumId },
													});
												}
											}}
											disabled={!song.albumId}
										>
											<IconDisc class="mr-2 size-4" />
											Go to Album
										</ContextMenuItem>
										<ContextMenuSeparator />
										<ContextMenuItem
											onSelect={() => {
												if (song.starred) {
													unstar({ id: song.id });
												} else {
													star({ id: song.id });
												}
											}}
										>
											<Show
												when={song.starred}
												fallback={<IconStar class="mr-2 size-4" />}
											>
												<IconStarFilled class="mr-2 size-4 text-warning" />
											</Show>
											{song.starred ? "Unstar" : "Star"}
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
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

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
