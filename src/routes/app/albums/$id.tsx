import {
	IconClock,
	IconList,
	IconPlayerPlay,
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
import { ErrorComponent } from "~/components/ErrorComponent";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { albumQueryOptions, type Song, star, unstar } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/albums/$id")({
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(albumQueryOptions(params.id)),
	errorComponent: ErrorComponent,
	component: AlbumDetailPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AlbumDetailPage() {
	const params = Route.useParams();
	const navigate = useNavigate();
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	const {
		playSong: play,
		currentTrack,
		playNextInQueue,
		addToQueue,
	} = usePlayer();

	const album = useQuery(() => albumQueryOptions(params().id));

	const handlePlaySong = (song: Song, index: number) => {
		// Logic to play song and set queue to album
		const songs = album.data?.songs || [];
		play(song, songs, index);
	};

	return (
		<div class="flex flex-col gap-4 h-full overflow-y-auto">
			<Show
				when={!album.isLoading && album.data}
				fallback={<div>Loading…</div>}
			>
				<ContextMenu>
					<ContextMenuTrigger>
						<div class="panel-surface flex flex-col items-center gap-6 border border-border px-5 py-5 text-center md:flex-row md:items-end md:gap-8 md:px-6 md:text-left">
							<div class="size-48 md:size-56 bg-muted rounded-none border border-border flex shrink-0 items-center justify-center overflow-hidden">
								<CoverArt
									id={album.data?.album.coverArt}
									class="size-full grayscale-[0.2]"
								/>
							</div>
							<div class="flex flex-col gap-2">
								<span class="panel-heading text-muted-foreground">Album</span>
								<h1 class="page-title break-words text-foreground">
									{album.data?.album.name}
								</h1>
								<p class="mt-2 text-muted-foreground md:mt-3">
									{album.data?.album.artist} •{" "}
									{album.data?.album.year || "Unknown Year"} •{" "}
									{album.data?.album.songCount} songs
								</p>
							</div>
						</div>
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem
							onSelect={() => {
								if (album.data?.songs) {
									play(album.data.songs[0], album.data.songs, 0);
								}
							}}
						>
							<IconPlayerPlay class="mr-2 size-4" />
							Play Album
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => {
								if (album.data?.songs) {
									addToQueue(album.data.songs);
								}
							}}
						>
							<IconList class="mr-2 size-4" />
							Add to Queue
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => {
								if (album.data?.songs) {
									setPlaylistDialogState({
										open: true,
										songIds: album.data.songs.map((s) => s.id),
									});
								}
							}}
						>
							<IconPlaylistAdd class="mr-2 size-4" />
							Add to Playlist…
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							onSelect={() => {
								if (album.data?.album.artistId) {
									navigate({
										to: "/app/artists/$id",
										params: { id: album.data.album.artistId },
									});
								}
							}}
							disabled={!album.data?.album.artistId}
						>
							<IconUser class="mr-2 size-4" />
							Go to Artist
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							onSelect={() => {
								if (album.data?.album.starred) {
									unstar({ albumId: album.data.album.id });
								} else {
									star({ albumId: album.data?.album.id });
								}
							}}
						>
							<Show
								when={album.data?.album.starred}
								fallback={<IconStar class="mr-2 size-4" />}
							>
								<IconStarFilled class="mr-2 size-4 text-warning" />
							</Show>
							{album.data?.album.starred ? "Unstar" : "Star"}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>

				<div class="panel-surface overflow-auto border border-border">
					<div class="grid grid-cols-[28px_40px_minmax(0,1fr)_52px] gap-2 border-b border-border bg-background/95 px-2 py-3 text-xs font-medium tracking-[0.08em] text-muted-foreground backdrop-blur sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] sm:gap-4 sm:px-4 md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_80px] sticky top-0 z-10">
						<div>#</div>
						<div></div>
						<div>Title</div>
						<div class="hidden md:block">Artist</div>
						<div class="text-right">
							<IconClock class="ml-auto size-4" />
						</div>
					</div>

					<For each={album.data?.songs}>
						{(song, i) => (
							<ContextMenu>
								<ContextMenuTrigger>
									<button
										type="button"
										class="grid h-[60px] w-full grid-cols-[28px_40px_minmax(0,1fr)_52px] items-center gap-2 border-b border-border/50 bg-transparent px-2 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] sm:gap-4 sm:px-4 md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_80px]"
										onClick={() => handlePlaySong(song, i())}
									>
										<div class="font-medium text-muted-foreground hover:text-foreground group-hover:text-foreground">
											<span class="text-xs">{song.track || i() + 1}</span>
										</div>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded-none border border-border"
										/>
										<div class="truncate font-medium">
											<span
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
											>
												{song.title}
											</span>
										</div>
										<div class="hidden truncate text-muted-foreground md:block">
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
										onSelect={() => {
											setPlaylistDialogState({
												open: true,
												songIds: [song.id],
											});
										}}
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
				</div>
			</Show>

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
