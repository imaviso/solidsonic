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
import { getPlaylist, type Song } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/playlists/$id")({
	component: PlaylistDetailPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function PlaylistDetailPage() {
	const params = Route.useParams();
	const { playSong: play, currentTrack } = usePlayer();

	const playlist = useQuery(() => ({
		queryKey: ["playlist", params().id],
		queryFn: () => getPlaylist(params().id),
	}));

	const handlePlaySong = (song: Song, index: number) => {
		// Logic to play song and set queue to playlist
		const songs = playlist.data?.entry || [];
		play(song, songs, index);
	};

	return (
		<div class="flex flex-col gap-6">
			<Show
				when={!playlist.isLoading && playlist.data}
				fallback={<div>Loading...</div>}
			>
				<div class="flex items-end gap-6 pb-6 border-b">
					<div class="size-32 bg-muted rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
						<CoverArt id={playlist.data?.coverArt} class="size-full" />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-muted-foreground uppercase">
							Playlist
						</span>
						<h1 class="text-4xl font-bold">{playlist.data?.name}</h1>
						<p class="text-muted-foreground">
							{playlist.data?.songCount} songs •{" "}
							{Math.floor((playlist.data?.duration || 0) / 60)} mins
						</p>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-[50px]">#</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Artist</TableHead>
							<TableHead>Album</TableHead>
							<TableHead class="text-right">
								<IconClock class="size-4 ml-auto" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={playlist.data?.entry}>
							{(song, i) => (
								<TableRow
									class="group cursor-pointer hover:bg-muted/50"
									onClick={() => handlePlaySong(song, i())}
								>
									<TableCell class="font-medium text-muted-foreground group-hover:text-foreground">
										<span class="group-hover:hidden">{i() + 1}</span>
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
