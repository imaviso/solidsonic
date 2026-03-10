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
		<div class="flex flex-col gap-4 h-full overflow-y-auto">
			<div class="panel-surface flex flex-col gap-4 border border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
				<div>
					<div class="panel-heading mb-3">Collections</div>
					<h2 class="page-title">Playlists</h2>
					<p class="mt-2 text-muted-foreground">
						Your curated collections and queue-ready listening sets.
					</p>
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

			<div class="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<Show
					when={!playlists.isLoading}
					fallback={
						<div class="state-panel col-span-full">
							<div class="state-copy">Loading playlists…</div>
						</div>
					}
				>
					<Show
						when={(playlists.data?.length ?? 0) > 0}
						fallback={
							<div class="state-panel col-span-full">
								<div class="state-copy">
									No playlists yet. Create one to save queue-ready collections.
								</div>
							</div>
						}
					>
						<For each={playlists.data}>
							{(playlist) => (
								<Link
									to="/app/playlists/$id"
									params={{ id: playlist.id }}
									class="block group"
								>
									<div class="metric-panel flex h-full aspect-square flex-col items-center justify-center gap-4 border border-transparent bg-background p-4 text-center transition-[background-color,transform,border-color] group-hover:-translate-y-1 group-hover:border-foreground/40 group-hover:bg-accent/30 sm:p-6">
										<div class="flex size-16 items-center justify-center border border-border bg-main-content text-primary transition-transform group-hover:-translate-y-1">
											<IconPlaylist class="size-8" />
										</div>
										<div class="w-full">
											<div class="panel-heading mb-2">Playlist</div>
											<h3 class="mx-auto w-full max-w-[150px] line-clamp-2 text-base font-semibold transition-colors group-hover:text-primary">
												{playlist.name}
											</h3>
											<p class="mt-1 text-sm text-muted-foreground">
												{playlist.songCount} songs
											</p>
										</div>
									</div>
								</Link>
							)}
						</For>
					</Show>
				</Show>
			</div>
		</div>
	);
}
