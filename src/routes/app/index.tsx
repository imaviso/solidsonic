import {
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
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import CoverArt from "~/components/CoverArt";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "~/components/ui/carousel";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	type AlbumListType,
	albumListQueryOptions,
	genreListQueryOptions,
	getAlbum,
	getStarred,
	type Song,
	star,
	unstar,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/")({
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(albumListQueryOptions("newest", 12)),
			queryClient.ensureQueryData(albumListQueryOptions("recent", 12)),
			queryClient.ensureQueryData(albumListQueryOptions("frequent", 12)),
			queryClient.ensureQueryData(genreListQueryOptions()),
		]);
	},
	component: DashboardPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AlbumCarouselSkeleton() {
	return (
		<Carousel
			opts={{
				align: "start",
			}}
			class="w-full md:w-auto md:mx-12"
		>
			<CarouselContent>
				<For each={Array(6).fill(0)}>
					{(_) => (
						<CarouselItem class="basis-[160px] md:basis-[200px]">
							<div class="block">
								<Card class="border-0 shadow-none bg-transparent">
									<CardContent class="p-0">
										<div class="aspect-square rounded-md bg-muted animate-pulse" />
										<div class="pt-2 space-y-2">
											<div class="h-4 w-3/4 bg-muted animate-pulse rounded" />
											<div class="h-3 w-1/2 bg-muted animate-pulse rounded" />
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					)}
				</For>
			</CarouselContent>
			<CarouselPrevious class="hidden md:flex" />
			<CarouselNext class="hidden md:flex" />
		</Carousel>
	);
}

function AlbumSection(props: {
	title: string;
	type: AlbumListType;
	onAddToPlaylist: (albumId: string) => void;
}) {
	const albums = useQuery(() => albumListQueryOptions(props.type, 12));
	const player = usePlayer();
	const navigate = useNavigate();

	return (
		<div class="min-w-0">
			<div class="flex items-center justify-between mb-4 px-1">
				<h2 class="text-2xl font-bold tracking-tight">{props.title}</h2>
			</div>
			<Show when={!albums.isLoading} fallback={<AlbumCarouselSkeleton />}>
				<Show
					when={albums.data && albums.data.length > 0}
					fallback={
						<div class="text-muted-foreground text-sm italic px-1">
							No albums found.
						</div>
					}
				>
					<Carousel
						opts={{
							align: "start",
						}}
						class="w-full md:w-auto md:mx-12"
					>
						<CarouselContent>
							<For each={albums.data}>
								{(album) => (
									<CarouselItem class="basis-[160px] md:basis-[200px]">
										<ContextMenu>
											<ContextMenuTrigger>
												<Link
													to="/app/albums/$id"
													params={{ id: album.id }}
													class="block group"
												>
													<Card class="border-0 shadow-none bg-transparent">
														<CardContent class="p-0">
															<div class="aspect-square w-full relative overflow-hidden rounded-md shadow-sm bg-muted">
																<CoverArt
																	id={album.coverArt}
																	class="h-full w-full object-cover"
																/>
															</div>
															<div class="pt-2">
																<h3 class="font-medium truncate group-hover:underline">
																	{album.name}
																</h3>
																<p class="text-xs text-muted-foreground truncate">
																	{album.artist}
																</p>
															</div>
														</CardContent>
													</Card>
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
															console.error("Failed to add album to queue", e);
														}
													}}
												>
													<IconList class="mr-2 size-4" />
													Add to Queue
												</ContextMenuItem>
												<ContextMenuItem
													onSelect={() => props.onAddToPlaylist(album.id)}
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
									</CarouselItem>
								)}
							</For>
						</CarouselContent>
						<CarouselPrevious class="hidden md:flex" />
						<CarouselNext class="hidden md:flex" />
					</Carousel>
				</Show>
			</Show>
		</div>
	);
}

function StarredSongsSection(props: {
	onAddToPlaylist: (songId: string) => void;
}) {
	const {
		playSong: play,
		currentTrack,
		addToQueue,
		playNextInQueue,
	} = usePlayer();
	const starred = useQuery(() => ({
		queryKey: ["starred"],
		queryFn: getStarred,
	}));
	const navigate = useNavigate();

	const handlePlaySong = (song: Song, index: number) => {
		const songList = starred.data?.songs || [];
		play(song, songList, index);
	};

	return (
		<div class="min-w-0">
			<h2 class="text-2xl font-bold tracking-tight mb-4 px-1">
				Favorite Songs
			</h2>
			<Show
				when={!starred.isLoading}
				fallback={
					<div class="space-y-2 px-1">
						<div class="h-10 bg-muted animate-pulse rounded" />
						<div class="h-10 bg-muted animate-pulse rounded" />
					</div>
				}
			>
				<div class="flex flex-col gap-1 px-1">
					<For each={starred.data?.songs?.slice(0, 5) ?? []}>
						{(song, i) => (
							<ContextMenu>
								<ContextMenuTrigger>
									<button
										type="button"
										class="grid grid-cols-[30px_40px_1fr_1fr_60px] gap-3 px-3 py-2 items-center rounded-md hover:bg-muted/50 group cursor-pointer text-sm w-full text-left"
										onClick={() => handlePlaySong(song, i())}
									>
										<div class="text-muted-foreground text-xs group-hover:text-primary flex justify-center">
											<span class="group-hover:hidden">{i() + 1}</span>
											<IconPlayerPlayFilled class="size-3 hidden group-hover:block" />
										</div>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded shadow-sm"
										/>
										<div class="font-medium truncate">
											<span
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
											>
												{song.title}
											</span>
										</div>
										<div class="truncate text-muted-foreground">
											{song.artist}
										</div>
										<div class="text-right font-mono text-xs text-muted-foreground">
											{formatDuration(song.duration)}
										</div>
									</button>
								</ContextMenuTrigger>
								<ContextMenuContent>
									<ContextMenuItem onSelect={() => handlePlaySong(song, i())}>
										<IconPlayerPlay class="mr-2 size-4" />
										Play
									</ContextMenuItem>
									<ContextMenuItem onSelect={() => playNextInQueue(song)}>
										<IconPlayerSkipForward class="mr-2 size-4" />
										Play Next
									</ContextMenuItem>
									<ContextMenuItem onSelect={() => addToQueue([song])}>
										<IconList class="mr-2 size-4" />
										Add to Queue
									</ContextMenuItem>
									<ContextMenuItem
										onSelect={() => props.onAddToPlaylist(song.id)}
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
											<IconStarFilled class="mr-2 size-4 text-yellow-500" />
										</Show>
										{song.starred ? "Unstar" : "Star"}
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						)}
					</For>
					<Show when={starred.data?.songs?.length === 0}>
						<div class="text-muted-foreground text-sm italic">
							No favorite songs yet.
						</div>
					</Show>
					<Show when={(starred.data?.songs?.length ?? 0) > 5}>
						<div class="pt-2">
							<Link
								to="/app/songs"
								class="text-xs text-primary hover:underline"
							>
								View all songs
							</Link>
						</div>
					</Show>
				</div>
			</Show>
		</div>
	);
}

function GenreSection() {
	const genres = useQuery(() => genreListQueryOptions());

	return (
		<div class="min-w-0">
			<h2 class="text-2xl font-bold tracking-tight mb-4 px-1">Genres</h2>
			<Show
				when={!genres.isLoading}
				fallback={<div class="h-10 bg-muted animate-pulse rounded" />}
			>
				<div class="flex flex-wrap gap-2 px-1">
					<For each={genres.data?.slice(0, 20) ?? []}>
						{(genre) => (
							<Link to="/app/genres/$genre" params={{ genre: genre.value }}>
								<Badge
									variant="secondary"
									class="text-sm px-3 py-1 hover:bg-secondary/80 cursor-pointer"
								>
									{genre.value}
								</Badge>
							</Link>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}

function DashboardPage() {
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	const handleAddAlbumToPlaylist = async (albumId: string) => {
		try {
			const data = await getAlbum(albumId);
			setPlaylistDialogState({
				open: true,
				songIds: data.songs.map((s) => s.id),
			});
		} catch (e) {
			console.error("Failed to fetch album for playlist", e);
		}
	};

	const handleAddSongToPlaylist = (songId: string) => {
		setPlaylistDialogState({
			open: true,
			songIds: [songId],
		});
	};

	return (
		<div class="flex flex-col gap-10 pb-10 h-full overflow-y-auto">
			<AlbumSection
				title="New Arrivals"
				type="newest"
				onAddToPlaylist={handleAddAlbumToPlaylist}
			/>
			<StarredSongsSection onAddToPlaylist={handleAddSongToPlaylist} />
			<AlbumSection
				title="Recently Played"
				type="recent"
				onAddToPlaylist={handleAddAlbumToPlaylist}
			/>
			<AlbumSection
				title="Most Played"
				type="frequent"
				onAddToPlaylist={handleAddAlbumToPlaylist}
			/>
			<AlbumSection
				title="Favorites"
				type="starred"
				onAddToPlaylist={handleAddAlbumToPlaylist}
			/>
			<AlbumSection
				title="Quick Picks"
				type="random"
				onAddToPlaylist={handleAddAlbumToPlaylist}
			/>
			<GenreSection />

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
