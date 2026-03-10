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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	type Album,
	type AlbumListType,
	getAlbum,
	getAlbumList,
	star,
	unstar,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";
import { queryKeys } from "~/lib/query";

const GAP = 16;
const TEXT_HEIGHT = 112;
const ALBUM_PAGE_SIZE = 50;
const ALBUM_SERVER_FILTERS = [
	"random",
	"newest",
	"highest",
	"frequent",
	"recent",
] as const;
type AlbumServerFilter = (typeof ALBUM_SERVER_FILTERS)[number];
const DEFAULT_ALBUM_FILTER: AlbumServerFilter = "newest";

export const Route = createFileRoute("/app/albums/")({
	validateSearch: (
		search: Record<string, unknown>,
	): { filter?: AlbumServerFilter } => {
		const rawFilter = search.filter;
		if (typeof rawFilter !== "string") {
			return {};
		}

		const normalizedFilter = ALBUM_SERVER_FILTERS.find(
			(filter) => filter === rawFilter,
		);
		if (!normalizedFilter || normalizedFilter === DEFAULT_ALBUM_FILTER) {
			return {};
		}

		return { filter: normalizedFilter };
	},
	loaderDeps: ({ search }) => ({
		filter: search.filter ?? DEFAULT_ALBUM_FILTER,
	}),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.prefetchInfiniteQuery({
			queryKey: queryKeys.albums.infiniteByType(deps.filter, ALBUM_PAGE_SIZE),
			queryFn: ({ pageParam, signal }) =>
				getAlbumList(deps.filter, ALBUM_PAGE_SIZE, pageParam as number, signal),
			initialPageParam: 0,
			getNextPageParam: (lastPage: Album[], allPages: Album[][]) => {
				if (lastPage.length < ALBUM_PAGE_SIZE) return undefined;
				return allPages.length * ALBUM_PAGE_SIZE;
			},
		}),
	component: AlbumsPage,
});

function formatAlbumFilterLabel(value: AlbumServerFilter): string {
	if (value === "highest") return "Highest Rated";
	if (value === "frequent") return "Most Played";
	if (value === "recent") return "Recently Played";
	if (value === "newest") return "Newest";
	return "Random";
}

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
	const search = Route.useSearch();
	const albumListType = createMemo<AlbumServerFilter>(
		() => search().filter ?? DEFAULT_ALBUM_FILTER,
	);

	const albums = useInfiniteQuery(() => ({
		queryKey: queryKeys.albums.infiniteByType(albumListType(), ALBUM_PAGE_SIZE),
		queryFn: ({ pageParam, signal }) =>
			getAlbumList(
				albumListType() as AlbumListType,
				ALBUM_PAGE_SIZE,
				pageParam as number,
				signal,
			),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < ALBUM_PAGE_SIZE) return undefined;
			return allPages.length * ALBUM_PAGE_SIZE;
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	}));

	const allAlbums = createMemo(() => albums.data?.pages.flat() ?? []);

	const rows = createMemo(() => {
		const list = allAlbums();
		const cols = columns();
		const result = [];
		for (let i = 0; i < list.length; i += cols) {
			result.push(list.slice(i, i + cols));
		}
		return result;
	});

	const rowHeight = createMemo(() => {
		const width = containerWidth();
		const cols = columns();
		if (width === 0) return 300;

		const totalGaps = (cols - 1) * GAP;
		const colWidth = (width - totalGaps) / cols;
		return Math.floor(colWidth + TEXT_HEIGHT + GAP);
	});

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
		overscan: 5,
	});

	createEffect(() => {
		rowHeight();
		virtualizer.measure();
	});

	createEffect(() => {
		albumListType();
		if (scrollContainerRef) {
			scrollContainerRef.scrollTop = 0;
		}
	});

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
			<div class="flex-none space-y-3">
				<div class="panel-surface mb-2 flex flex-col gap-4 border border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
					<div>
						<div class="panel-heading mb-3">Library Surface</div>
						<h2 class="page-title">Albums</h2>
						<p class="mt-2 text-muted-foreground">
							Browse the full album catalog with quick playback and queue
							actions.
						</p>
					</div>
					<div class="w-full sm:w-[220px]">
						<div class="panel-heading mb-2 block">Album View</div>
						<Select
							value={albumListType()}
							onChange={(value) => {
								if (!value) return;
								const nextFilter = value as AlbumServerFilter;
								navigate({
									to: "/app/albums",
									search:
										nextFilter === DEFAULT_ALBUM_FILTER
											? {}
											: { filter: nextFilter },
									replace: true,
								});
							}}
							options={[...ALBUM_SERVER_FILTERS]}
							itemComponent={(props) => (
								<SelectItem
									item={props.item}
									class="focus:bg-primary/10 focus:text-primary rounded-none"
								>
									{formatAlbumFilterLabel(props.item.rawValue)}
								</SelectItem>
							)}
						>
							<SelectTrigger class="h-11 sm:h-10 w-full rounded-none bg-transparent shadow-none hover:bg-muted/50 transition-colors">
								<SelectValue<AlbumServerFilter>>
									{(state) =>
										formatAlbumFilterLabel(
											state.selectedOption() ?? DEFAULT_ALBUM_FILTER,
										)
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent class="rounded-none bg-background"></SelectContent>
						</Select>
					</div>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Showing {allAlbums().length} loaded albums
				</p>
			</div>

			<div
				ref={scrollContainerRef}
				class="panel-surface flex-1 min-h-0 overflow-y-auto border border-border p-4"
			>
				<Show
					when={rows().length > 0}
					fallback={
						<Show when={!albums.isLoading}>
							<div class="state-panel">
								<div class="state-copy">No albums found for this view.</div>
							</div>
						</Show>
					}
				>
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
															class="block group h-full border border-transparent bg-background transition-[border-color,transform] hover:-translate-y-1 hover:border-foreground"
														>
															<div class="flex h-full flex-col">
																<div class="aspect-square w-full relative overflow-hidden rounded-none border-b border-border bg-muted/30">
																	<CoverArt
																		id={album.coverArt}
																		class="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
																	/>
																</div>
																<div class="flex flex-1 flex-col justify-between px-3 py-3">
																	<div class="panel-heading mb-2">Album</div>
																	<h3 class="line-clamp-2 text-base font-semibold tracking-tight transition-colors group-hover:text-foreground">
																		{album.name}
																	</h3>
																	<p class="mt-1 truncate text-sm text-muted-foreground">
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
															Add to Playlist…
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
																<IconStarFilled class="mr-2 size-4 text-warning" />
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
					<div class="state-panel">
						<div class="state-copy">Loading albums…</div>
					</div>
				</Show>

				<Show when={albums.isFetchingNextPage}>
					<div class="py-4 text-center text-muted-foreground text-sm">
						Loading more…
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
