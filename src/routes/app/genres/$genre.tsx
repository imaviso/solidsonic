import { IconPlayerPlay } from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { getSongsByGenre } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/genres/$genre")({
	component: GenreDetailPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function GenreDetailPage() {
	const params = Route.useParams();
	const { playSong: play } = usePlayer();

	const songs = useQuery(() => ({
		queryKey: ["genre", params().genre],
		queryFn: () => getSongsByGenre(params().genre, 100),
	}));

	return (
		<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-muted-foreground uppercase">
					Genre
				</span>
				<h1 class="text-4xl font-bold">{params().genre}</h1>
			</div>

			<Show when={!songs.isLoading} fallback={<div>Loading...</div>}>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-[50px]">#</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Artist</TableHead>
							<TableHead>Album</TableHead>
							<TableHead class="text-right">Duration</TableHead>
							<TableHead class="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={songs.data}>
							{(song, i) => (
								<TableRow class="group">
									<TableCell class="font-medium text-muted-foreground">
										{i() + 1}
									</TableCell>
									<TableCell class="font-medium">{song.title}</TableCell>
									<TableCell>{song.artist}</TableCell>
									<TableCell>{song.album}</TableCell>
									<TableCell class="text-right font-mono text-xs">
										{formatDuration(song.duration)}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											class="opacity-0 group-hover:opacity-100 h-8 w-8"
											onClick={() => play(song, songs.data!, i())}
										>
											<IconPlayerPlay class="size-4" />
										</Button>
									</TableCell>
								</TableRow>
							)}
						</For>
					</TableBody>
				</Table>
			</Show>
		</div>
	);
}
