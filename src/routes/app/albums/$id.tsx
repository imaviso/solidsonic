import {
	IconClock,
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
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
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
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<Show
				when={!album.isLoading && album.data}
				fallback={<div>Loading...</div>}
			>
				<ContextMenu>
					<ContextMenuTrigger>
						<div class="flex items-end gap-6 pb-6 border-b">
							<div class="size-32 bg-muted rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
								<CoverArt id={album.data?.album.coverArt} class="size-full" />
							</div>
							<div class="flex flex-col gap-2">
								<span class="text-sm font-medium text-muted-foreground uppercase">
									Album
								</span>
								<h1 class="text-4xl font-bold">{album.data?.album.name}</h1>
								<p class="text-muted-foreground">
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
							Add to Playlist...
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
								<IconStarFilled class="mr-2 size-4 text-yellow-500" />
							</Show>
							{album.data?.album.starred ? "Unstar" : "Star"}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-[50px]">#</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Artist</TableHead>
							<TableHead class="text-right">
								<IconClock class="size-4 ml-auto" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={album.data?.songs}>
							{(song, i) => (
								<ContextMenu>
									<ContextMenuTrigger
										as={TableRow}
										class="group cursor-pointer hover:bg-muted/50"
										onClick={() => handlePlaySong(song, i())}
									>
										<TableCell class="font-medium text-muted-foreground group-hover:text-foreground">
											<span class="group-hover:hidden">
												{song.track || i() + 1}
											</span>
											<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
										</TableCell>
										<TableCell class="font-medium">
											<span
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
											>
												{song.title}
											</span>
										</TableCell>
										<TableCell>{song.artist}</TableCell>
										<TableCell class="text-right font-mono text-xs text-muted-foreground">
											{formatDuration(song.duration)}
										</TableCell>
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
					</TableBody>
				</Table>
			</Show>

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
