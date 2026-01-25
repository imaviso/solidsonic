import { IconClock, IconPlayerPlayFilled } from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { getAlbum, type Song } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/albums/$id")({
	component: AlbumDetailPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AlbumDetailPage() {
	const params = Route.useParams();
	const { playSong: play, currentTrack } = usePlayer();

	const album = useQuery(() => ({
		queryKey: ["album", params().id],
		queryFn: () => getAlbum(params().id),
	}));

	const handlePlaySong = (song: Song, index: number) => {
		// Logic to play song and set queue to album
		const songs = album.data?.songs || [];
		play(song, songs, index);
	};

	return (
		<div class="flex flex-col gap-6">
			<Show
				when={!album.isLoading && album.data}
				fallback={<div>Loading...</div>}
			>
				<div class="flex items-end gap-6 pb-6 border-b">
					<div class="size-32 bg-muted rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
						<CoverArt id={album.data?.album.coverArt} class="size-full" />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-muted-foreground uppercase">
							Album
						</span>
						<h1 class="text-4xl font-bold">{album.data?.album.name}</h1>
						<p class="text-muted-foreground">
							{album.data?.album.artist} •{" "}
							{album.data?.album.year || "Unknown Year"} •{" "}
							{album.data?.album.songCount} songs
						</p>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-[50px]">#</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Artist</TableHead>
							<TableHead class="text-right">
								<IconClock class="size-4 ml-auto" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={album.data?.songs}>
							{(song, i) => (
								<TableRow
									class="group cursor-pointer hover:bg-muted/50"
									onClick={() => handlePlaySong(song, i())}
								>
									<TableCell class="font-medium text-muted-foreground group-hover:text-foreground">
										<span class="group-hover:hidden">
											{song.track || i() + 1}
										</span>
										<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
									</TableCell>
									<TableCell class="font-medium">
										<span
											class={currentTrack?.id === song.id ? "text-primary" : ""}
										>
											{song.title}
										</span>
									</TableCell>
									<TableCell>{song.artist}</TableCell>
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
