import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { Card, CardContent } from "~/components/ui/card";
import { getGenres } from "~/lib/api";

export const Route = createFileRoute("/app/genres/")({
	component: GenresPage,
});

function GenresPage() {
	const genres = useQuery(() => ({
		queryKey: ["genres"],
		queryFn: getGenres,
	}));

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
						)}
					</For>
				</Show>
			</div>
		</div>
	);
}
