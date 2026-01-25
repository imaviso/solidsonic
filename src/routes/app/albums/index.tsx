import {
	IconList,
	IconPlayerPlay,
	IconPlaylistAdd,
	IconStar,
	IconStarFilled,
	IconUser,
} from "@tabler/icons-solidjs";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import CoverArt from "~/components/CoverArt";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	albumListQueryOptions,
	getAlbum,
	getAlbumList,
	star,
	unstar,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/albums/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(albumListQueryOptions("newest", 50, 0)),
	component: AlbumsPage,
});

const GAP = 16; // gap-4
const TEXT_HEIGHT = 52;

function AlbumsPage() {
	let scrollContainerRef: HTMLDivElement | undefined;
	const [columns, setColumns] = createSignal(5);
	const [containerWidth, setContainerWidth] = createSignal(1000);
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	const player = usePlayer();
	const navigate = useNavigate();

	// Stable Infinite Query
	const albums = useInfiniteQuery(() => ({
		queryKey: ["albums", "list", "infinite"],
		queryFn: ({ pageParam }) => getAlbumList("newest", 50, pageParam as number),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < 50) return undefined;
			return allPages.length * 50;
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	}));

	const allAlbums = createMemo(() => albums.data?.pages.flat() ?? []);

	// Memoize rows to ensure stability
	const rows = createMemo(() => {
		const list = allAlbums();
		const cols = columns();
		const result = [];
		for (let i = 0; i < list.length; i += cols) {
			result.push(list.slice(i, i + cols));
		}
		return result;
	});

	// Calculate row height based on width
	const rowHeight = createMemo(() => {
		const width = containerWidth();
		const cols = columns();
		if (width === 0) return 300;

		// Width = container width (clientWidth includes padding if set, but we removed padding from container)
		// We will add padding to the INNER grid content if needed, or just assume full width.
		const totalGaps = (cols - 1) * GAP;
		const colWidth = (width - totalGaps) / cols;
		return Math.floor(colWidth + TEXT_HEIGHT + GAP);
	});

	// Track container size
	onMount(() => {
		if (!scrollContainerRef) return;

		const updateSize = () => {
			const width = scrollContainerRef.clientWidth;
			setContainerWidth(width);

			let newCols = 5;
			if (width < 400) newCols = 2;
			else if (width < 600) newCols = 3;
			else if (width < 800) newCols = 4;
			else if (width < 1000) newCols = 5;
			else newCols = 6;

			setColumns(newCols);
		};
		updateSize();

		const resizeObserver = new ResizeObserver(updateSize);
		resizeObserver.observe(scrollContainerRef);

		onCleanup(() => resizeObserver.disconnect());
	});

	const virtualizer = createVirtualizer({
		get count() {
			return rows().length;
		},
		getScrollElement: () => scrollContainerRef ?? null,
		estimateSize: () => rowHeight(),
		overscan: 5, // Reduced overscan now that structure is stable
	});

	// Re-measure when row height changes
	createEffect(() => {
		rowHeight();
		virtualizer.measure();
	});

	// Fetch more when scrolling
	createEffect(() => {
		const items = virtualizer.getVirtualItems();
		if (items.length === 0) return;

		const lastItem = items[items.length - 1];
		if (
			lastItem &&
			lastItem.index >= rows().length - 3 &&
			albums.hasNextPage &&
			!albums.isFetchingNextPage
		) {
			albums.fetchNextPage();
		}
	});

	return (
		<div class="flex flex-col gap-4 h-full">
			<div class="flex-none">
				<h2 class="text-3xl font-bold tracking-tight">Albums</h2>
				<p class="text-muted-foreground">Your music library</p>
			</div>

			<div ref={scrollContainerRef} class="flex-1 overflow-y-auto min-h-0">
				<Show when={rows().length > 0}>
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						<For each={virtualizer.getVirtualItems()}>
							{(virtualRow) => {
								const rowAlbums = rows()[virtualRow.index];
								if (!rowAlbums) return null;

								return (
									<div
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										<div
											class="grid gap-4"
											style={{
												"grid-template-columns": `repeat(${columns()}, minmax(0, 1fr))`,
											}}
										>
											{rowAlbums.map((album) => (
												<ContextMenu>
													<ContextMenuTrigger>
														<Link
															to="/app/albums/$id"
															params={{ id: album.id }}
															class="block group h-full"
														>
															<div class="flex flex-col">
																<div class="aspect-square w-full relative overflow-hidden rounded-md shadow-sm bg-muted">
																	<CoverArt
																		id={album.coverArt}
																		class="h-full w-full object-cover"
																	/>
																</div>
																<div class="pt-2">
																	<h3 class="font-medium text-sm truncate group-hover:underline">
																		{album.name}
																	</h3>
																	<p class="text-xs text-muted-foreground truncate">
																		{album.artist}
																	</p>
																</div>
															</div>
														</Link>
													</ContextMenuTrigger>
													<ContextMenuContent>
														<ContextMenuItem
															onSelect={async () => {
																try {
																	const data = await getAlbum(album.id);
																	player.playAlbum(data.songs);
																} catch (e) {
																	console.error("Failed to play album", e);
																}
															}}
														>
															<IconPlayerPlay class="mr-2 size-4" />
															Play
														</ContextMenuItem>
														<ContextMenuItem
															onSelect={async () => {
																try {
																	const data = await getAlbum(album.id);
																	player.addToQueue(data.songs);
																} catch (e) {
																	console.error(
																		"Failed to add album to queue",
																		e,
																	);
																}
															}}
														>
															<IconList class="mr-2 size-4" />
															Add to Queue
														</ContextMenuItem>
														<ContextMenuItem
															onSelect={async () => {
																try {
																	const data = await getAlbum(album.id);
																	setPlaylistDialogState({
																		open: true,
																		songIds: data.songs.map((s) => s.id),
																	});
																} catch (e) {
																	console.error(
																		"Failed to prepare playlist add",
																		e,
																	);
																}
															}}
														>
															<IconPlaylistAdd class="mr-2 size-4" />
															Add to Playlist...
														</ContextMenuItem>
														<ContextMenuSeparator />
														<ContextMenuItem
															onSelect={() => {
																if (album.artistId) {
																	navigate({
																		to: "/app/artists/$id",
																		params: { id: album.artistId },
																	});
																}
															}}
															disabled={!album.artistId}
														>
															<IconUser class="mr-2 size-4" />
															Go to Artist
														</ContextMenuItem>
														<ContextMenuSeparator />
														<ContextMenuItem
															onSelect={() => {
																if (album.starred) {
																	unstar({ albumId: album.id });
																} else {
																	star({ albumId: album.id });
																}
															}}
														>
															<Show
																when={album.starred}
																fallback={<IconStar class="mr-2 size-4" />}
															>
																<IconStarFilled class="mr-2 size-4 text-yellow-500" />
															</Show>
															{album.starred ? "Unstar" : "Star"}
														</ContextMenuItem>
													</ContextMenuContent>
												</ContextMenu>
											))}
										</div>
									</div>
								);
							}}
						</For>
					</div>
				</Show>

				<Show when={albums.isLoading}>
					<div class="py-10 text-center">Loading...</div>
				</Show>

				<Show when={albums.isFetchingNextPage}>
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
