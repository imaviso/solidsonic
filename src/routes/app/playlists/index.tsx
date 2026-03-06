import { IconPlaylist, IconPlus } from "@tabler/icons-solidjs";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { PlaylistDialog } from "~/components/PlaylistDialog";
import { Button } from "~/components/ui/button";
import { playlistListQueryOptions } from "~/lib/api";
import { queryKeys } from "~/lib/query";

export const Route = createFileRoute("/app/playlists/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(playlistListQueryOptions()),
	component: PlaylistsPage,
});

function PlaylistsPage() {
	const queryClient = useQueryClient();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = createSignal(false);

	const playlists = useQuery(() => playlistListQueryOptions());

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
						Playlists
					</h2>
					<p class="text-muted-foreground">Your curated collections</p>
				</div>
				<Button
					class="h-11 sm:h-10 w-full sm:w-auto"
					onClick={() => setIsCreateDialogOpen(true)}
				>
					<IconPlus class="size-4 mr-2" />
					Create Playlist
				</Button>
			</div>

			<PlaylistDialog
				open={isCreateDialogOpen()}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
				}}
			/>

			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				<Show
					when={!playlists.isLoading}
					fallback={<div class="col-span-full text-center">Loading...</div>}
				>
					<For each={playlists.data}>
						{(playlist) => (
							<Link
								to="/app/playlists/$id"
								params={{ id: playlist.id }}
								class="block group"
							>
								<div class="flex flex-col items-center justify-center text-center gap-4 h-full aspect-square bg-muted/30 hover:bg-muted/50 rounded-2xl transition-[transform,box-shadow,background-color] hover:-translate-y-1 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-2px_rgba(0,0,0,0.1)] p-4 sm:p-6">
									<div class="p-5 rounded-full bg-background shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-2px_rgba(0,0,0,0.1)] text-primary group-hover:scale-110 transition-transform">
										<IconPlaylist class="size-8" />
									</div>
									<div class="w-full">
										<h3 class="font-bold text-base truncate w-full max-w-[150px] mx-auto group-hover:text-primary transition-colors">
											{playlist.name}
										</h3>
										<p class="text-sm font-medium text-muted-foreground opacity-80">
											{playlist.songCount} songs
										</p>
									</div>
								</div>
							</Link>
						)}
					</For>
				</Show>
			</div>
		</div>
	);
}
