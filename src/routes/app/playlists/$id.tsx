import {
	IconClock,
	IconEdit,
	IconPlayerPlayFilled,
	IconTrash,
	IconX,
} from "@tabler/icons-solidjs";
import {
	createMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
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
	type Playlist,
	type PlaylistWithSongs,
	playlistQueryOptions,
	type Song,
	updatePlaylist,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";
import { queryKeys } from "~/lib/query";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/app/playlists/$id")({
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(playlistQueryOptions(params.id)),
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
	const playlist = useQuery(() => playlistQueryOptions(params().id));

	const removeSongMutation = createMutation(() => ({
		mutationFn: (songIndex: number) =>
			updatePlaylist({
				playlistId: params().id,
				songIndexToRemove: [songIndex],
			}),
		onMutate: async (songIndex) => {
			const detailKey = queryKeys.playlists.detail(params().id);
			await queryClient.cancelQueries({ queryKey: detailKey });

			const previous = queryClient.getQueryData<PlaylistWithSongs>(detailKey);
			if (!previous?.entry) {
				return { previous };
			}

			const removed = previous.entry[songIndex];
			queryClient.setQueryData<PlaylistWithSongs>(detailKey, {
				...previous,
				entry: previous.entry.filter((_, i) => i !== songIndex),
				songCount: Math.max((previous.songCount ?? 0) - 1, 0),
				duration: Math.max(
					(previous.duration ?? 0) - (removed?.duration ?? 0),
					0,
				),
			});

			return { previous };
		},
		onError: (error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(
					queryKeys.playlists.detail(params().id),
					context.previous,
				);
			}
			showToast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to remove song",
				variant: "destructive",
			});
		},
		onSuccess: () => {
			showToast({
				title: "Song Removed",
				description: "Song removed from playlist.",
			});
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.playlists.detail(params().id),
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
		},
	}));

	const deletePlaylistMutation = createMutation(() => ({
		mutationFn: (playlistId: string) => deletePlaylist(playlistId),
		onMutate: async (playlistId) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.playlists.all });
			const previous = queryClient.getQueryData<Playlist[]>(
				queryKeys.playlists.all,
			);
			if (previous) {
				queryClient.setQueryData<Playlist[]>(
					queryKeys.playlists.all,
					previous.filter((item) => item.id !== playlistId),
				);
			}
			return { previous };
		},
		onError: (error, _playlistId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKeys.playlists.all, context.previous);
			}
			showToast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to delete playlist",
				variant: "destructive",
			});
			setIsDeleteDialogOpen(false);
		},
		onSuccess: () => {
			showToast({
				title: "Playlist Deleted",
				description: "The playlist has been removed.",
			});
			navigate({ to: "/app/playlists" });
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
		},
	}));

	const isDeleting = () => deletePlaylistMutation.isPending;

	const handlePlaySong = (song: Song, index: number) => {
		const songs = playlist.data?.entry || [];
		play(song, songs, index);
	};

	const handleDeletePlaylist = async () => {
		try {
			await deletePlaylistMutation.mutateAsync(params().id);
		} catch {
			// Error toast and rollback are handled in mutation callbacks.
		}
	};

	const handleRemoveSong = async (e: Event, index: number) => {
		e.stopPropagation();
		try {
			await removeSongMutation.mutateAsync(index);
		} catch {
			// Error toast and rollback are handled in mutation callbacks.
		}
	};

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<Show
				when={!playlist.isLoading && playlist.data}
				fallback={<div>Loading...</div>}
			>
				<div class="flex flex-col md:flex-row items-center md:items-end gap-6 pb-6 border-b-2 border-muted/50 text-center md:text-left">
					<div class="size-40 md:size-32 bg-muted rounded-[1.5rem] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-2px_rgba(0,0,0,0.1)] flex shrink-0 items-center justify-center overflow-hidden">
						<CoverArt id={playlist.data?.coverArt} class="size-full" />
					</div>
					<div class="flex flex-col gap-2 flex-1">
						<span class="text-sm font-medium text-muted-foreground uppercase">
							Playlist
						</span>
						<h1 class="text-3xl md:text-4xl font-bold break-words">
							{playlist.data?.name}
						</h1>
						<p class="text-muted-foreground">
							{playlist.data?.songCount} songs •{" "}
							{Math.floor((playlist.data?.duration || 0) / 60)} mins
						</p>
					</div>
					<div class="flex gap-2 w-full md:w-auto justify-center">
						<Button
							variant="outline"
							size="icon"
							class="size-11 md:size-10"
							onClick={() => setIsRenameDialogOpen(true)}
						>
							<IconEdit class="size-4" />
						</Button>
						<Button
							variant="destructive"
							size="icon"
							class="size-11 md:size-10"
							onClick={() => setIsDeleteDialogOpen(true)}
						>
							<IconTrash class="size-4" />
						</Button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[50px]">#</TableHead>
								<TableHead class="w-[48px]"></TableHead>
								<TableHead>Title</TableHead>
								<TableHead class="hidden md:table-cell">Artist</TableHead>
								<TableHead class="hidden md:table-cell">Album</TableHead>
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
												class="size-10 rounded-md shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)]"
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
										<TableCell class="hidden md:table-cell">
											<Show when={song.artistId} fallback={song.artist}>
												<Link
													to="/app/artists/$id"
													params={{ id: song.artistId ?? "" }}
													class="hover:text-foreground hover:underline"
													onClick={(e) => e.stopPropagation()}
												>
													{song.artist}
												</Link>
											</Show>
										</TableCell>
										<TableCell class="hidden md:table-cell">
											<Show when={song.albumId} fallback={song.album}>
												<Link
													to="/app/albums/$id"
													params={{ id: song.albumId ?? "" }}
													class="hover:text-foreground hover:underline"
													onClick={(e) => e.stopPropagation()}
												>
													{song.album}
												</Link>
											</Show>
										</TableCell>
										<TableCell class="text-right font-mono text-xs text-muted-foreground">
											{formatDuration(song.duration)}
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger
													class={cn(
														buttonVariants({ variant: "ghost", size: "icon" }),
														"size-11 md:size-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive",
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
				</div>

				<PlaylistDialog
					open={isRenameDialogOpen()}
					onOpenChange={setIsRenameDialogOpen}
					mode="edit"
					playlistId={playlist.data?.id}
					currentName={playlist.data?.name}
					onSuccess={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.playlists.detail(params().id),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.playlists.all,
						});
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
