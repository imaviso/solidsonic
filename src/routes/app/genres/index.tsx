import {
	IconList,
	IconPlayerPlay,
	IconPlaylistAdd,
} from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import { Card, CardContent } from "~/components/ui/card";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { getGenres, getSongsByGenre } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/genres/")({
	component: GenresPage,
});

function GenresPage() {
	const genres = useQuery(() => ({
		queryKey: ["genres"],
		queryFn: getGenres,
	}));
	const player = usePlayer();
	const _navigate = useNavigate();
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
				<h2 class="text-3xl font-bold tracking-tight">Genres</h2>
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
										class="block group"
									>
										<Card class="h-full hover:bg-muted/50 transition-colors">
											<CardContent class="p-6 flex flex-col items-center justify-center text-center gap-2">
												<span class="font-semibold text-lg group-hover:underline">
													{genre.value}
												</span>
												<span class="text-xs text-muted-foreground">
													{genre.albumCount} albums
												</span>
											</CardContent>
										</Card>
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
