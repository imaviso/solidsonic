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
		return `${biography().slice(0, MAX_BIO_LENGTH).trim()}…`;
	};

	return (
		<div class="flex h-full flex-col gap-4 overflow-y-auto">
			<Show
				when={!artist.isLoading && artist.data}
				fallback={
					<div class="state-panel">
						<div class="state-copy">Loading artist…</div>
					</div>
				}
			>
				{/* Header with artist info */}
				<div class="panel-surface flex flex-col items-center gap-6 border border-border px-5 py-5 text-center sm:flex-row sm:items-end sm:gap-8 sm:px-6 sm:text-left">
					<div class="flex size-48 items-center justify-center overflow-hidden border border-border bg-muted sm:size-56">
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
								width={224}
								height={224}
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
					<div class="panel-surface border border-border px-5 py-5 sm:px-6">
						<div class="panel-heading mb-3">About</div>
						<h2 class="section-title">Biography</h2>
						<p class="mt-3 max-w-3xl text-wrap text-muted-foreground leading-relaxed">
							{displayBio()}
						</p>
						<Show when={shouldTruncate()}>
							<Button
								variant="link"
								size="sm"
								class="mt-3 h-auto p-0 text-primary"
								onClick={() => setIsBioExpanded(!isBioExpanded())}
							>
								{isBioExpanded() ? "Show Less" : "More Info"}
							</Button>
						</Show>
					</div>
				</Show>

				{/* Similar Artists */}
				<Show when={artistInfo.data?.similarArtists.length}>
					<div class="panel-surface border border-border px-5 py-5 sm:px-6">
						<div class="panel-heading mb-3">Related</div>
						<h2 class="section-title">Similar Artists</h2>
						<div class="mt-4 flex gap-4 overflow-x-auto pb-2">
							<For each={artistInfo.data?.similarArtists}>
								{(similarArtist) => (
									<Link
										to="/app/artists/$id"
										params={{ id: similarArtist.id }}
										class="group block w-28 shrink-0 border border-transparent bg-background transition-[border-color,transform] hover:-translate-y-1 hover:border-foreground"
									>
										<div class="text-center">
											<div class="mb-0 flex size-28 items-center justify-center overflow-hidden border-b border-border bg-muted">
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
														width={112}
														height={112}
														class="size-full object-cover"
													/>
												</Show>
											</div>
											<div class="px-3 py-3">
												<div class="panel-heading mb-2">Artist</div>
												<p class="line-clamp-2 text-sm font-semibold group-hover:text-primary">
													{similarArtist.name}
												</p>
											</div>
										</div>
									</Link>
								)}
							</For>
						</div>
					</div>
				</Show>

				{/* Albums */}
				<div class="panel-surface border border-border px-5 py-5 sm:px-6">
					<div class="panel-heading mb-3">Discography</div>
					<h2 class="section-title">Albums</h2>
					<div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						<For each={artist.data?.albums}>
							{(album) => (
								<Link
									to="/app/albums/$id"
									params={{ id: album.id }}
									class="block group h-full border border-transparent bg-background transition-[border-color,transform] hover:-translate-y-1 hover:border-foreground"
								>
									<div class="flex h-full flex-col">
										<div class="relative aspect-square w-full overflow-hidden border-b border-border bg-muted/30">
											<CoverArt
												id={album.coverArt}
												class="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
											/>
										</div>
										<div class="flex flex-1 flex-col justify-between px-3 py-3">
											<div class="panel-heading mb-2">Album</div>
											<h3 class="line-clamp-2 text-base font-semibold tracking-tight transition-colors group-hover:text-foreground">
												{album.name}
											</h3>
											<p class="mt-1 truncate text-sm text-muted-foreground">
												{album.year || "Unknown Year"}
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
