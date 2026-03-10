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
import { createMemo, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import CoverArt from "~/components/CoverArt";
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
	type Album,
	type AlbumListType,
	albumListQueryOptions,
	genreListQueryOptions,
	getAlbum,
	type Song,
	star,
	starredQueryOptions,
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

function DashboardOverview() {
	const newest = useQuery(() => albumListQueryOptions("newest", 5));
	const starred = useQuery(() => starredQueryOptions());
	const genres = useQuery(() => genreListQueryOptions());

	return (
		<div class="grid gap-px border border-border bg-border lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
			<div class="panel-surface bg-background px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Overview</div>
				<h1 class="page-title">Dashboard</h1>
				<p class="mt-2 max-w-xl text-muted-foreground">
					A compact control surface for new arrivals, saved tracks, and the
					library lanes you return to most often.
				</p>
			</div>
			<div class="metric-panel bg-background px-4 py-4">
				<div class="panel-heading">New arrivals</div>
				<div class="mt-3 text-2xl font-semibold tracking-[-0.04em]">
					{newest.data?.length ?? 0}
				</div>
				<div class="mt-1 text-sm text-muted-foreground">
					Fresh albums staged now
				</div>
			</div>
			<div class="metric-panel bg-background px-4 py-4">
				<div class="panel-heading">Favorites</div>
				<div class="mt-3 text-2xl font-semibold tracking-[-0.04em]">
					{starred.data?.songs?.length ?? 0}
				</div>
				<div class="mt-1 text-sm text-muted-foreground">
					Pinned songs in rotation
				</div>
			</div>
			<div class="metric-panel bg-background px-4 py-4">
				<div class="panel-heading">Genres</div>
				<div class="mt-3 text-2xl font-semibold tracking-[-0.04em]">
					{genres.data?.length ?? 0}
				</div>
				<div class="mt-1 text-sm text-muted-foreground">
					Browse lanes available
				</div>
			</div>
		</div>
	);
}

function NewArrivalsEditorial(props: {
	onAddToPlaylist: (albumId: string) => void;
}) {
	const albums = useQuery(() => albumListQueryOptions("newest", 5));
	const player = usePlayer();
	const navigate = useNavigate();
	const featuredAlbum = createMemo(() => albums.data?.[0]);
	const secondaryAlbum = createMemo(() => albums.data?.[1]);
	const tertiaryAlbum = createMemo(() => albums.data?.[2]);

	const AlbumCard = (p: {
		album: Album;
		class?: string;
		featured?: boolean;
		hideArtist?: boolean;
	}) => {
		return (
			<ContextMenu>
				<ContextMenuTrigger>
					<Link
						to="/app/albums/$id"
						params={{ id: p.album.id }}
						class={`block group border border-transparent bg-background transition-[border-color,transform] hover:-translate-y-1 hover:border-foreground ${p.class || ""}`}
					>
						<div class="relative overflow-hidden bg-muted/30">
							<CoverArt
								id={p.album.coverArt}
								class="w-full h-full object-cover aspect-square grayscale-[0.2] group-hover:grayscale-0 transition-all"
							/>
						</div>
						<div class="px-3 py-3">
							<div class="panel-heading mb-2">Album</div>
							<h3
								class={`line-clamp-2 font-semibold tracking-tight ${p.featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
							>
								{p.album.name}
							</h3>
							<Show when={!p.hideArtist}>
								<p class="mt-1 truncate text-sm text-muted-foreground">
									{p.album.artist}
								</p>
							</Show>
						</div>
					</Link>
				</ContextMenuTrigger>
				<ContextMenuContent class="rounded-none border-2 border-border shadow-none">
					<ContextMenuItem
						onSelect={async () => {
							try {
								const data = await getAlbum(p.album.id);
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
								const data = await getAlbum(p.album.id);
								player.addToQueue(data.songs);
							} catch (e) {
								console.error("Failed to add album to queue", e);
							}
						}}
					>
						<IconList class="mr-2 size-4" />
						Add to Queue
					</ContextMenuItem>
					<ContextMenuItem onSelect={() => props.onAddToPlaylist(p.album.id)}>
						<IconPlaylistAdd class="mr-2 size-4" />
						Add to Playlist…
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onSelect={() => {
							if (p.album.artistId) {
								navigate({
									to: "/app/artists/$id",
									params: { id: p.album.artistId },
								});
							}
						}}
						disabled={!p.album.artistId}
					>
						<IconUser class="mr-2 size-4" />
						Go to Artist
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onSelect={() => {
							if (p.album.starred) {
								unstar({ albumId: p.album.id });
							} else {
								star({ albumId: p.album.id });
							}
						}}
					>
						<Show
							when={p.album.starred}
							fallback={<IconStar class="mr-2 size-4" />}
						>
							<IconStarFilled class="mr-2 size-4 text-warning" />
						</Show>
						{p.album.starred ? "Unstar" : "Star"}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	};

	return (
		<div class="panel-surface flex h-full min-w-0 flex-col border border-border">
			<div class="shell-divider px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Arrival Queue</div>
				<h2 class="page-title text-foreground">New arrivals</h2>
				<p class="mt-2 text-muted-foreground">
					Latest additions surfaced in a compact listening queue.
				</p>
			</div>

			<Show
				when={!albums.isLoading}
				fallback={
					<div class="h-96 bg-muted animate-pulse m-4 border border-border sm:m-6" />
				}
			>
				<Show when={albums.data && albums.data.length > 0}>
					<div class="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-12 md:gap-5 sm:p-6">
						<div class="md:col-span-7 xl:col-span-8">
							<Show when={featuredAlbum()}>
								{(album) => (
									<AlbumCard album={album()} featured class="h-full" />
								)}
							</Show>
						</div>

						<div class="grid content-start grid-cols-2 gap-4 md:col-span-5 md:grid-cols-1 xl:col-span-4">
							<Show when={secondaryAlbum()}>
								{(album) => <AlbumCard album={album()} />}
							</Show>
							<Show when={tertiaryAlbum()}>
								{(album) => <AlbumCard album={album()} />}
							</Show>
						</div>
					</div>
				</Show>
			</Show>
		</div>
	);
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
								<div class="block">
									<div class="aspect-square rounded-none bg-muted/30 animate-pulse" />
									<div class="pt-3 space-y-2">
										<div class="h-4 w-3/4 bg-muted/40 animate-pulse rounded-none" />
										<div class="h-3 w-1/2 bg-muted/40 animate-pulse rounded-none" />
									</div>
								</div>
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
	label: string;
	description: string;
	type: AlbumListType;
	onAddToPlaylist: (albumId: string) => void;
}) {
	const albums = useQuery(() => albumListQueryOptions(props.type, 12));
	const player = usePlayer();
	const navigate = useNavigate();

	return (
		<div class="panel-surface min-w-0 border border-border">
			<div class="shell-divider px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">{props.label}</div>
				<h2 class="section-title">{props.title}</h2>
				<p class="mt-2 text-sm text-muted-foreground">{props.description}</p>
			</div>
			<div class="p-4 sm:p-5">
				<Show when={!albums.isLoading} fallback={<AlbumCarouselSkeleton />}>
					<Show
						when={albums.data && albums.data.length > 0}
						fallback={
							<div class="px-1 text-sm italic text-muted-foreground">
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
														<div class="block">
															<div class="aspect-square w-full relative overflow-hidden rounded-none border-2 border-transparent bg-muted/30 transition-colors group-hover:border-foreground">
																<CoverArt
																	id={album.coverArt}
																	class="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
																/>
															</div>
															<div class="pt-3 px-1">
																<h3 class="truncate text-lg font-semibold tracking-tight group-hover:text-foreground transition-colors">
																	{album.name}
																</h3>
																<p class="truncate text-sm text-muted-foreground opacity-80">
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
														onSelect={() => props.onAddToPlaylist(album.id)}
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
	const starred = useQuery(() => starredQueryOptions());
	const navigate = useNavigate();

	const handlePlaySong = (song: Song, index: number) => {
		const songList = starred.data?.songs || [];
		play(song, songList, index);
	};

	return (
		<div class="panel-surface flex h-full min-w-0 flex-col border border-border">
			<div class="shell-divider px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Pinned Tracks</div>
				<h2 class="section-title">Favorite Songs</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Fast access to songs you revisit often.
				</p>
			</div>
			<Show
				when={!starred.isLoading}
				fallback={
					<div class="space-y-2 p-4 sm:p-5">
						<div class="h-10 bg-muted animate-pulse rounded-none" />
						<div class="h-10 bg-muted animate-pulse rounded-none" />
					</div>
				}
			>
				<div class="flex flex-1 flex-col gap-1 p-4 sm:p-5">
					<For each={starred.data?.songs?.slice(0, 5) ?? []}>
						{(song, i) => (
							<ContextMenu>
								<ContextMenuTrigger>
									<button
										type="button"
										class="grid w-full grid-cols-[24px_36px_minmax(0,1fr)_52px] items-center gap-2 border-b border-border/50 px-2 py-2 text-left text-sm transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[30px_40px_minmax(0,1fr)_60px] sm:gap-3 sm:px-3 md:grid-cols-[30px_40px_minmax(0,1fr)_minmax(0,1fr)_60px]"
										onClick={() => handlePlaySong(song, i())}
									>
										<div class="flex justify-center text-xs text-muted-foreground group-hover:text-background">
											<span class="group-hover:hidden">{i() + 1}</span>
											<IconPlayerPlayFilled class="size-3 hidden group-hover:block" />
										</div>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded-none border-2 border-transparent group-hover:border-background object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
										/>
										<div class="truncate text-sm font-semibold tracking-tight sm:text-base">
											<span
												class={
													currentTrack?.id === song.id
														? "text-primary group-hover:text-background"
														: ""
												}
											>
												{song.title}
											</span>
										</div>
										<div class="hidden truncate text-muted-foreground group-hover:text-background/80 md:block">
											{song.artist}
										</div>
										<div class="text-right font-mono text-xs text-muted-foreground group-hover:text-background/80">
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
										Add to Playlist…
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
						)}
					</For>
					<Show when={starred.data?.songs?.length === 0}>
						<div class="text-muted-foreground text-sm italic">
							No favorite songs yet.
						</div>
					</Show>
					<Show when={(starred.data?.songs?.length ?? 0) > 5}>
						<div class="pt-3">
							<Link
								to="/app/songs"
								class="panel-heading text-primary hover:text-foreground"
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
		<div class="panel-surface min-w-0 border border-border">
			<div class="shell-divider px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Browse Lanes</div>
				<h2 class="section-title">Genres</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Jump into catalog slices without leaving the dashboard.
				</p>
			</div>
			<Show
				when={!genres.isLoading}
				fallback={
					<div class="m-4 h-10 rounded-none bg-muted animate-pulse sm:m-5" />
				}
			>
				<div class="flex flex-wrap gap-3 p-4 sm:p-5">
					<For each={genres.data?.slice(0, 20) ?? []}>
						{(genre) => (
							<Link
								to="/app/genres/$genre"
								params={{ genre: genre.value }}
								class="inline-flex min-h-11 items-center rounded-none border-2 border-border px-4 py-2 text-sm font-medium tracking-[0.04em] transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
							>
								{genre.value}
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
		<div class="flex h-full flex-col gap-4 overflow-y-auto">
			<DashboardOverview />
			<div class="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
				<NewArrivalsEditorial onAddToPlaylist={handleAddAlbumToPlaylist} />
				<StarredSongsSection onAddToPlaylist={handleAddSongToPlaylist} />
			</div>
			<div class="grid gap-4 lg:grid-cols-2">
				<AlbumSection
					title="Recently Played"
					label="Playback History"
					description="Resume albums you touched most recently."
					type="recent"
					onAddToPlaylist={handleAddAlbumToPlaylist}
				/>
				<AlbumSection
					title="Most Played"
					label="Listener Pattern"
					description="Your heaviest rotation, surfaced as a working set."
					type="frequent"
					onAddToPlaylist={handleAddAlbumToPlaylist}
				/>
				<AlbumSection
					title="Favorites"
					label="Saved Albums"
					description="Starred records held for repeat sessions."
					type="starred"
					onAddToPlaylist={handleAddAlbumToPlaylist}
				/>
				<AlbumSection
					title="Quick Picks"
					label="Shuffle Deck"
					description="A lighter lane for exploration and instant queueing."
					type="random"
					onAddToPlaylist={handleAddAlbumToPlaylist}
				/>
			</div>
			<GenreSection />

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
