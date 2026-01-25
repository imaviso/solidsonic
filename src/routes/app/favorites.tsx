import {
	IconClock,
	IconPlayerPlayFilled,
	IconStarFilled,
} from "@tabler/icons-solidjs";
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
import { getStarred, type Song } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/favorites")({
	component: FavoritesPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function FavoritesPage() {
	const { playSong: play, currentTrack } = usePlayer();

	const starred = useQuery(() => ({
		queryKey: ["starred"],
		queryFn: getStarred,
	}));

	const handlePlaySong = (song: Song, index: number) => {
		// Logic to play song and set queue
		const songList = starred.data?.songs || [];
		play(song, songList, index);
	};

	const handlePlayAll = () => {
		if (starred.data?.songs && starred.data.songs.length > 0) {
			play(starred.data.songs[0], starred.data.songs, 0);
		}
	};

	return (
		<div class="flex flex-col gap-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div class="p-3 bg-primary/10 rounded-full text-primary">
						<IconStarFilled class="size-6" />
					</div>
					<div>
						<h2 class="text-3xl font-bold tracking-tight">Favorites</h2>
						<p class="text-muted-foreground">Your starred songs</p>
					</div>
				</div>
				<Button onClick={handlePlayAll} disabled={!starred.data?.songs?.length}>
					<IconPlayerPlayFilled class="mr-2 size-4" />
					Play All
				</Button>
			</div>

			<Show when={!starred.isLoading} fallback={<div>Loading...</div>}>
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
						<Show
							when={starred.data?.songs?.length}
							fallback={
								<TableRow>
									<TableCell
										colSpan={6}
										class="text-center h-24 text-muted-foreground"
									>
										No favorite songs yet. Star some songs to see them here!
									</TableCell>
								</TableRow>
							}
						>
							<For each={starred.data?.songs}>
								{(song, i) => (
									<TableRow
										class="group cursor-pointer hover:bg-muted/50"
										onClick={() => handlePlaySong(song, i())}
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
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
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
						</Show>
					</TableBody>
				</Table>
			</Show>
		</div>
	);
}
