import { IconClock, IconPlayerPlayFilled } from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
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
	const { playSong: play, currentTrack } = usePlayer();

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
							<TableHead class="w-[48px]"></TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Artist</TableHead>
							<TableHead>Album</TableHead>
							<TableHead class="text-right">
								<IconClock class="size-4 ml-auto" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={songs.data}>
							{(song, i) => (
								<TableRow
									class="group cursor-pointer hover:bg-muted/50"
									onClick={() => {
										const songList = songs.data;
										if (songList) {
											play(song, songList, i());
										}
									}}
								>
									<TableCell class="font-medium text-muted-foreground group-hover:text-foreground">
										<span class="group-hover:hidden text-xs">{i() + 1}</span>
										<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
									</TableCell>
									<TableCell>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded shadow-sm"
										/>
									</TableCell>
									<TableCell class="font-medium">
										<span
											class={currentTrack?.id === song.id ? "text-primary" : ""}
										>
											{song.title}
										</span>
									</TableCell>
									<TableCell>{song.artist}</TableCell>
									<TableCell>{song.album}</TableCell>
									<TableCell class="text-right font-mono text-xs text-muted-foreground">
										{formatDuration(song.duration)}
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
