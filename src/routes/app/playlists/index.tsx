import { IconPlaylist } from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { Card, CardContent } from "~/components/ui/card";
import { getPlaylists } from "~/lib/api";

export const Route = createFileRoute("/app/playlists/")({
	component: PlaylistsPage,
});

function PlaylistsPage() {
	const playlists = useQuery(() => ({
		queryKey: ["playlists"],
		queryFn: getPlaylists,
	}));

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<div>
				<h2 class="text-3xl font-bold tracking-tight">Playlists</h2>
				<p class="text-muted-foreground">Your curated collections</p>
			</div>

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
								<Card class="h-full border-0 shadow-none bg-muted/40 hover:bg-muted/60 transition-colors">
									<CardContent class="p-6 flex flex-col items-center justify-center text-center gap-4 h-full aspect-square">
										<div class="p-4 rounded-full bg-background shadow-sm">
											<IconPlaylist class="size-8 text-primary" />
										</div>
										<div>
											<h3 class="font-semibold truncate w-full max-w-[150px]">
												{playlist.name}
											</h3>
											<p class="text-xs text-muted-foreground">
												{playlist.songCount} songs
											</p>
										</div>
									</CardContent>
								</Card>
							</Link>
						)}
					</For>
				</Show>
			</div>
		</div>
	);
}
