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
		<div class="flex flex-col gap-4 h-full overflow-y-auto">
			<div class="panel-surface border border-border px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Taxonomy</div>
				<h2 class="page-title">Genres</h2>
				<p class="text-muted-foreground">Browse by genre</p>
			</div>

			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<Show
					when={!genres.isLoading}
					fallback={
						<div class="state-panel col-span-full">
							<div class="state-copy">Loading genres…</div>
						</div>
					}
				>
					<Show
						when={(genres.data?.length ?? 0) > 0}
						fallback={
							<div class="state-panel col-span-full">
								<div class="state-copy">
									No genres are available for this library.
								</div>
							</div>
						}
					>
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
											class="block group h-full"
										>
											<div class="metric-panel flex h-full aspect-[2/1] flex-col items-center justify-center gap-2 border border-transparent bg-background p-4 text-center transition-[background-color,transform,border-color] group-hover:-translate-y-1 group-hover:border-foreground/40 group-hover:bg-accent/30 sm:p-6">
												<div class="panel-heading mb-1">Genre</div>
												<span class="line-clamp-2 text-base font-semibold group-hover:text-primary transition-colors sm:text-lg">
													{genre.value}
												</span>
												<span class="text-sm text-muted-foreground">
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
											Add to Playlist…
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							)}
						</For>
					</Show>
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
