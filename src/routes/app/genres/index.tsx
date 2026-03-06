import {
	IconList,
	IconPlayerPlay,
	IconPlaylistAdd,
} from "@tabler/icons-solidjs";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	genreListQueryOptions,
	genreSongsQueryOptions,
	getSongsByGenre,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/genres/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(genreListQueryOptions()),
	component: GenresPage,
});

function GenresPage() {
	const genres = useQuery(() => genreListQueryOptions());
	const queryClient = useQueryClient();
	const player = usePlayer();
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<div>
				<h2 class="text-2xl sm:text-3xl font-bold tracking-tight">Genres</h2>
				<p class="text-muted-foreground">Browse by genre</p>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				<Show when={!genres.isLoading} fallback={<div>Loading...</div>}>
					<For each={genres.data}>
						{(genre) => (
							<ContextMenu>
								<ContextMenuTrigger>
									<Link
										to="/app/genres/$genre"
										params={{ genre: genre.value }}
										onPointerEnter={() => {
											void queryClient.prefetchQuery(
												genreSongsQueryOptions(genre.value, 100, 0),
											);
										}}
										class="block group"
									>
										<div class="flex flex-col items-center justify-center text-center gap-2 h-full aspect-[2/1] bg-muted/30 hover:bg-muted/50 rounded-2xl transition-[transform,box-shadow,background-color] hover:-translate-y-1 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-2px_rgba(0,0,0,0.1)] p-4 sm:p-6">
											<span class="font-bold text-base sm:text-lg group-hover:text-primary transition-colors">
												{genre.value}
											</span>
											<span class="text-sm font-medium text-muted-foreground opacity-80">
												{genre.albumCount} albums
											</span>
										</div>
									</Link>
								</ContextMenuTrigger>
								<ContextMenuContent>
									<ContextMenuItem
										onSelect={async () => {
											try {
												// Fetch top 50 songs from this genre and play them
												const songs = await getSongsByGenre(genre.value, 50);
												if (songs.length > 0) {
													player.playSong(songs[0], songs, 0);
												}
											} catch (e) {
												console.error("Failed to play genre", e);
											}
										}}
									>
										<IconPlayerPlay class="mr-2 size-4" />
										Play Genre
									</ContextMenuItem>
									<ContextMenuItem
										onSelect={async () => {
											try {
												const songs = await getSongsByGenre(genre.value, 50);
												if (songs.length > 0) {
													player.addToQueue(songs);
												}
											} catch (e) {
												console.error("Failed to add genre to queue", e);
											}
										}}
									>
										<IconList class="mr-2 size-4" />
										Add to Queue
									</ContextMenuItem>
									<ContextMenuItem
										onSelect={async () => {
											try {
												const songs = await getSongsByGenre(genre.value, 50);
												if (songs.length > 0) {
													setPlaylistDialogState({
														open: true,
														songIds: songs.map((s) => s.id),
													});
												}
											} catch (e) {
												console.error("Failed to fetch genre songs", e);
											}
										}}
									>
										<IconPlaylistAdd class="mr-2 size-4" />
										Add to Playlist...
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						)}
					</For>
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
