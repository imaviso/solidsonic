import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Card, CardContent } from "~/components/ui/card";
import { artistQueryOptions } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/artists/$id")({
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(artistQueryOptions(params.id)),
	errorComponent: ErrorComponent,
	component: ArtistDetailPage,
});

function ArtistDetailPage() {
	const params = Route.useParams();
	usePlayer();

	const artist = useQuery(() => artistQueryOptions(params().id));

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<Show
				when={!artist.isLoading && artist.data}
				fallback={<div>Loading...</div>}
			>
				<div class="flex items-end gap-6 pb-6 border-b">
					<div class="size-32 bg-muted rounded-full shadow-sm flex items-center justify-center overflow-hidden">
						<CoverArt id={artist.data?.artist.coverArt} class="size-full" />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-muted-foreground uppercase">
							Artist
						</span>
						<h1 class="text-4xl font-bold">{artist.data?.artist.name}</h1>
						<p class="text-muted-foreground">
							{artist.data?.albums.length} albums
						</p>
					</div>
				</div>

				<div>
					<h2 class="text-2xl font-bold mb-4">Albums</h2>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						<For each={artist.data?.albums}>
							{(album) => (
								<Link
									to="/app/albums/$id"
									params={{ id: album.id }}
									class="block group"
								>
									<Card class="border-0 shadow-none bg-transparent">
										<CardContent class="p-0">
											<CoverArt
												id={album.coverArt}
												class="aspect-square rounded-md shadow-sm"
											/>
											<div class="pt-2">
												<h3 class="font-medium truncate group-hover:underline">
													{album.name}
												</h3>
												<p class="text-xs text-muted-foreground truncate">
													{album.year}
												</p>
											</div>
										</CardContent>
									</Card>
								</Link>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
}
