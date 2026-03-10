import { IconClock, IconEdit, IconTrash, IconX } from "@tabler/icons-solidjs";
import {
	createMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query";
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
import { Button } from "~/components/ui/button";
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
		<div class="flex h-full flex-col gap-4 overflow-y-auto">
			<Show
				when={!playlist.isLoading && playlist.data}
				fallback={
					<div class="state-panel">
						<div class="state-copy">Loading playlist…</div>
					</div>
				}
			>
				<div class="panel-surface flex flex-col items-center gap-6 border border-border px-5 py-5 text-center md:flex-row md:items-end md:gap-8 md:px-6 md:text-left">
					<div class="size-48 md:size-56 bg-muted rounded-none border border-border flex shrink-0 items-center justify-center overflow-hidden">
						<CoverArt
							id={playlist.data?.coverArt}
							class="size-full grayscale-[0.2]"
						/>
					</div>
					<div class="flex flex-col gap-2 flex-1">
						<span class="panel-heading text-muted-foreground">Playlist</span>
						<h1 class="page-title break-words text-foreground">
							{playlist.data?.name}
						</h1>
						<p class="mt-2 text-muted-foreground md:mt-3">
							{playlist.data?.songCount} songs •{" "}
							{Math.floor((playlist.data?.duration || 0) / 60)} mins
						</p>
					</div>
					<div class="flex w-full justify-center gap-2 md:w-auto">
						<Button
							variant="outline"
							size="icon"
							class="size-11 md:size-11"
							onClick={() => setIsRenameDialogOpen(true)}
						>
							<IconEdit class="size-4" />
						</Button>
						<Button
							variant="destructive"
							size="icon"
							class="size-11 md:size-11"
							onClick={() => setIsDeleteDialogOpen(true)}
						>
							<IconTrash class="size-4" />
						</Button>
					</div>
				</div>

				<div class="panel-surface overflow-auto border border-border">
					<div class="grid grid-cols-[minmax(0,1fr)_44px] items-center border-b border-border bg-background px-2 py-3 text-xs font-medium tracking-[0.08em] text-muted-foreground sticky top-0 z-10 sm:px-4">
						<div class="grid grid-cols-[28px_40px_minmax(0,1fr)_52px] gap-2 sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] sm:gap-4 md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px]">
							<div>#</div>
							<div></div>
							<div>Title</div>
							<div class="hidden md:block">Artist</div>
							<div class="hidden md:block">Album</div>
							<div class="text-right">
								<IconClock class="ml-auto size-4" />
							</div>
						</div>
						<div></div>
					</div>

					<Show
						when={(playlist.data?.entry?.length ?? 0) > 0}
						fallback={
							<div class="state-panel">
								<div class="state-copy">
									This playlist is empty. Add songs to start playback from this
									view.
								</div>
							</div>
						}
					>
						<For each={playlist.data?.entry}>
							{(song, i) => (
								<div class="group grid grid-cols-[minmax(0,1fr)_44px] items-center border-b border-border/50 px-2 transition-colors hover:bg-primary/5 sm:px-4">
									<button
										type="button"
										class="grid h-[60px] min-w-0 grid-cols-[28px_40px_minmax(0,1fr)_52px] items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] sm:gap-4 md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px]"
										onClick={() => handlePlaySong(song, i())}
									>
										<div class="font-medium text-muted-foreground group-hover:text-foreground">
											<span class="text-xs">{i() + 1}</span>
										</div>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded-none border border-border object-cover"
										/>
										<div class="truncate font-medium">
											<span
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
											>
												{song.title}
											</span>
										</div>
										<div class="hidden truncate text-muted-foreground md:block">
											{song.artist}
										</div>
										<div class="hidden truncate text-muted-foreground md:block">
											{song.album}
										</div>
										<div class="text-right font-mono text-xs text-muted-foreground">
											{formatDuration(song.duration)}
										</div>
									</button>
									<div class="flex justify-end">
										<Tooltip>
											<TooltipTrigger
												as={Button}
												variant="ghost"
												size="icon"
												class="size-11 text-muted-foreground transition-opacity hover:text-destructive md:size-9 md:opacity-0 md:group-hover:opacity-100"
												onClick={(e: MouseEvent) => handleRemoveSong(e, i())}
											>
												<IconX class="size-4" />
											</TooltipTrigger>
											<TooltipContent>Remove from playlist</TooltipContent>
										</Tooltip>
									</div>
								</div>
							)}
						</For>
					</Show>
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
