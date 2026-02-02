import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { artistInfo2QueryOptions, artistQueryOptions } from "~/lib/api";
import { usePlayer } from "~/lib/player";

const MAX_BIO_LENGTH = 400;

export const Route = createFileRoute("/app/artists/$id")({
	loader: ({ context: { queryClient }, params }) =>
		Promise.all([
			queryClient.ensureQueryData(artistQueryOptions(params.id)),
			queryClient.ensureQueryData(artistInfo2QueryOptions(params.id)),
		]),
	errorComponent: ErrorComponent,
	component: ArtistDetailPage,
});

function ArtistDetailPage() {
	const params = Route.useParams();
	usePlayer();
	const [isBioExpanded, setIsBioExpanded] = createSignal(false);

	const artist = useQuery(() => artistQueryOptions(params().id));
	const artistInfo = useQuery(() => artistInfo2QueryOptions(params().id));

	const biography = () => artistInfo.data?.info.biography ?? "";
	const shouldTruncate = () => biography().length > MAX_BIO_LENGTH;
	const displayBio = () => {
		if (!shouldTruncate() || isBioExpanded()) {
			return biography();
		}
		return `${biography().slice(0, MAX_BIO_LENGTH).trim()}...`;
	};

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<Show
				when={!artist.isLoading && artist.data}
				fallback={<div>Loading...</div>}
			>
				{/* Header with artist info */}
				<div class="flex items-end gap-6 pb-6 border-b">
					<div class="size-32 bg-muted rounded-full shadow-sm flex items-center justify-center overflow-hidden">
						<Show
							when={artistInfo.data?.info.largeImageUrl}
							fallback={
								<CoverArt id={artist.data?.artist.coverArt} class="size-full" />
							}
						>
							<img
								src={artistInfo.data?.info.largeImageUrl}
								alt={artist.data?.artist.name}
								class="size-full object-cover"
							/>
						</Show>
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

				{/* Biography */}
				<Show when={biography()}>
					<div class="space-y-2">
						<h2 class="text-2xl font-bold">About</h2>
						<p class="text-muted-foreground leading-relaxed">{displayBio()}</p>
						<Show when={shouldTruncate()}>
							<Button
								variant="link"
								size="sm"
								class="p-0 h-auto text-primary"
								onClick={() => setIsBioExpanded(!isBioExpanded())}
							>
								{isBioExpanded() ? "Show Less" : "More Info"}
							</Button>
						</Show>
					</div>
				</Show>

				{/* Similar Artists */}
				<Show when={artistInfo.data?.similarArtists.length}>
					<div class="space-y-4">
						<h2 class="text-2xl font-bold">Similar Artists</h2>
						<div class="flex gap-4 overflow-x-auto pb-2">
							<For each={artistInfo.data?.similarArtists}>
								{(similarArtist) => (
									<Link
										to="/app/artists/$id"
										params={{ id: similarArtist.id }}
										class="flex-shrink-0 group"
									>
										<div class="w-24 text-center">
											<div class="size-24 bg-muted rounded-full shadow-sm flex items-center justify-center overflow-hidden mb-2">
												<Show
													when={similarArtist.largeImageUrl}
													fallback={
														<CoverArt
															id={similarArtist.coverArt}
															class="size-full"
														/>
													}
												>
													<img
														src={similarArtist.largeImageUrl}
														alt={similarArtist.name}
														class="size-full object-cover"
													/>
												</Show>
											</div>
											<p class="text-sm font-medium truncate group-hover:underline">
												{similarArtist.name}
											</p>
										</div>
									</Link>
								)}
							</For>
						</div>
					</div>
				</Show>

				{/* Albums */}
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
