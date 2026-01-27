import {
	IconClock,
	IconEdit,
	IconPlayerPlayFilled,
	IconTrash,
	IconX,
} from "@tabler/icons-solidjs";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import { PlaylistDialog } from "~/components/PlaylistDialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button, buttonVariants } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { showToast } from "~/components/ui/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	deletePlaylist,
	getPlaylist,
	type Song,
	updatePlaylist,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";
import { cn } from "~/lib/utils";

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
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { playSong: play, currentTrack } = usePlayer();

	const [isRenameDialogOpen, setIsRenameDialogOpen] = createSignal(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);

	const playlist = useQuery(() => ({
		queryKey: ["playlist", params().id],
		queryFn: () => getPlaylist(params().id),
	}));

	const handlePlaySong = (song: Song, index: number) => {
		const songs = playlist.data?.entry || [];
		play(song, songs, index);
	};

	const handleDeletePlaylist = async () => {
		setIsDeleting(true);
		try {
			await deletePlaylist(params().id);
			showToast({
				title: "Playlist Deleted",
				description: "The playlist has been removed.",
			});
			await queryClient.invalidateQueries({ queryKey: ["playlists"] });
			navigate({ to: "/app/playlists" });
		} catch (e) {
			showToast({
				title: "Error",
				description:
					e instanceof Error ? e.message : "Failed to delete playlist",
				variant: "destructive",
			});
			setIsDeleting(false);
			setIsDeleteDialogOpen(false);
		}
	};

	const handleRemoveSong = async (e: Event, index: number) => {
		e.stopPropagation();
		try {
			await updatePlaylist({
				playlistId: params().id,
				songIndexToRemove: [index],
			});
			showToast({
				title: "Song Removed",
				description: "Song removed from playlist.",
			});
			queryClient.invalidateQueries({ queryKey: ["playlist", params().id] });
		} catch (e) {
			showToast({
				title: "Error",
				description: e instanceof Error ? e.message : "Failed to remove song",
				variant: "destructive",
			});
		}
	};

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<Show
				when={!playlist.isLoading && playlist.data}
				fallback={<div>Loading...</div>}
			>
				<div class="flex items-end gap-6 pb-6 border-b">
					<div class="size-32 bg-muted rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
						<CoverArt id={playlist.data?.coverArt} class="size-full" />
					</div>
					<div class="flex flex-col gap-2 flex-1">
						<span class="text-sm font-medium text-muted-foreground uppercase">
							Playlist
						</span>
						<h1 class="text-4xl font-bold">{playlist.data?.name}</h1>
						<p class="text-muted-foreground">
							{playlist.data?.songCount} songs •{" "}
							{Math.floor((playlist.data?.duration || 0) / 60)} mins
						</p>
					</div>
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setIsRenameDialogOpen(true)}
						>
							<IconEdit class="size-4" />
						</Button>
						<Button
							variant="destructive"
							size="icon"
							onClick={() => setIsDeleteDialogOpen(true)}
						>
							<IconTrash class="size-4" />
						</Button>
					</div>
				</div>

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
							<TableHead class="w-[40px]"></TableHead>
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
									<TableCell>
										<Tooltip>
											<TooltipTrigger
												class={cn(
													buttonVariants({ variant: "ghost", size: "icon" }),
													"size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive",
												)}
												onClick={(e: MouseEvent) => handleRemoveSong(e, i())}
											>
												<IconX class="size-4" />
											</TooltipTrigger>
											<TooltipContent>Remove from playlist</TooltipContent>
										</Tooltip>
									</TableCell>
								</TableRow>
							)}
						</For>
					</TableBody>
				</Table>

				<PlaylistDialog
					open={isRenameDialogOpen()}
					onOpenChange={setIsRenameDialogOpen}
					mode="edit"
					playlistId={playlist.data?.id}
					currentName={playlist.data?.name}
					onSuccess={() => {
						queryClient.invalidateQueries({
							queryKey: ["playlist", params().id],
						});
						queryClient.invalidateQueries({ queryKey: ["playlists"] });
					}}
				/>

				<AlertDialog
					open={isDeleteDialogOpen()}
					onOpenChange={setIsDeleteDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								playlist "{playlist.data?.name}".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<Button
								variant="ghost"
								onClick={() => setIsDeleteDialogOpen(false)}
								disabled={isDeleting()}
							>
								Cancel
							</Button>
							<AlertDialogAction
								onClick={handleDeletePlaylist}
								disabled={isDeleting()}
								class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</Show>
		</div>
	);
}
