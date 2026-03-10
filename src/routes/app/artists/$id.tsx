import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Button } from "~/components/ui/button";
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
	const artistInfo = useQuery(() => ({
		...artistInfo2QueryOptions(params().id),
		enabled: !!artist.data?.artist.id,
	}));

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
				fallback={<div>Loading…</div>}
			>
				{/* Header with artist info */}
				<div class="flex flex-col items-center gap-6 pb-8 border-b-[6px] border-foreground text-center sm:flex-row sm:items-end sm:text-left sm:gap-10">
					<div class="size-48 sm:size-56 bg-muted rounded-none border border-border flex items-center justify-center overflow-hidden">
						<Show
							when={artistInfo.data?.info.largeImageUrl}
							fallback={
								<CoverArt
									id={artist.data?.artist.coverArt}
									class="size-full grayscale-[0.2]"
								/>
							}
						>
							<img
								src={artistInfo.data?.info.largeImageUrl}
								alt={artist.data?.artist.name}
								class="size-full object-cover grayscale-[0.2]"
							/>
						</Show>
					</div>
					<div class="flex flex-col gap-2">
						<span class="panel-heading text-muted-foreground">Artist</span>
						<h1 class="page-title break-words text-foreground">
							{artist.data?.artist.name}
						</h1>
						<p class="mt-2 text-muted-foreground md:mt-3">
							{artist.data?.albums.length} albums
						</p>
					</div>
				</div>

				{/* Biography */}
				<Show when={biography()}>
					<div class="space-y-2">
						<h2 class="section-title">About</h2>
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
						<h2 class="section-title">Similar Artists</h2>
						<div class="flex gap-4 overflow-x-auto pb-2">
							<For each={artistInfo.data?.similarArtists}>
								{(similarArtist) => (
									<Link
										to="/app/artists/$id"
										params={{ id: similarArtist.id }}
										class="flex-shrink-0 group"
									>
										<div class="w-24 text-center">
											<div class="size-24 bg-muted rounded-none border border-border shadow-sm flex items-center justify-center overflow-hidden mb-2">
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
				<div class="mt-8">
					<h2 class="section-title mb-6">Albums</h2>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
						<For each={artist.data?.albums}>
							{(album) => (
								<Link
									to="/app/albums/$id"
									params={{ id: album.id }}
									class="block group border-2 border-transparent hover:border-foreground transition-colors"
								>
									<div class="block">
										<div class="aspect-square w-full relative overflow-hidden rounded-none bg-muted/30">
											<CoverArt
												id={album.coverArt}
												class="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
											/>
										</div>
										<div class="pt-3 pb-2 px-1 border-t-2 border-transparent group-hover:border-foreground transition-colors">
											<h3 class="truncate text-lg font-semibold tracking-tight group-hover:text-foreground transition-colors">
												{album.name}
											</h3>
											<p class="truncate text-sm text-muted-foreground opacity-80">
												{album.year}
											</p>
										</div>
									</div>
								</Link>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
}
