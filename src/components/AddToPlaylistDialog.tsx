import { IconPlaylist, IconPlus } from "@tabler/icons-solidjs";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { showToast } from "~/components/ui/toast";
import { createPlaylist, getPlaylists, updatePlaylist } from "~/lib/api";

interface AddToPlaylistDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	songIds: string[];
}

export function AddToPlaylistDialog(props: AddToPlaylistDialogProps) {
	const queryClient = useQueryClient();
	const [newPlaylistName, setNewPlaylistName] = createSignal("");
	const [isCreating, setIsCreating] = createSignal(false);
	const [isSubmitting, setIsSubmitting] = createSignal(false);

	const playlists = createQuery(() => ({
		queryKey: ["playlists"],
		queryFn: getPlaylists,
	}));

	const handleCreateAndAdd = async () => {
		if (!newPlaylistName()) return;

		setIsSubmitting(true);
		try {
			const playlist = await createPlaylist({
				name: newPlaylistName(),
				songId: props.songIds,
			});
			showToast({
				title: "Playlist Created",
				description: `Added ${props.songIds.length} songs to "${playlist.name}"`,
			});
			queryClient.invalidateQueries({ queryKey: ["playlists"] });
			setNewPlaylistName("");
			setIsCreating(false);
			props.onOpenChange(false);
		} catch (e) {
			showToast({
				title: "Error",
				description:
					e instanceof Error ? e.message : "Failed to create playlist",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAddToExisting = async (
		playlistId: string,
		playlistName: string,
	) => {
		setIsSubmitting(true);
		try {
			await updatePlaylist({
				playlistId,
				songIdToAdd: props.songIds,
			});
			showToast({
				title: "Added to Playlist",
				description: `Added ${props.songIds.length} songs to "${playlistName}"`,
			});
			queryClient.invalidateQueries({ queryKey: ["playlists"] });
			props.onOpenChange(false);
		} catch (e) {
			showToast({
				title: "Error",
				description:
					e instanceof Error ? e.message : "Failed to add to playlist",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent class="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add to Playlist</DialogTitle>
					<DialogDescription>
						Add {props.songIds.length} song
						{props.songIds.length === 1 ? "" : "s"} to a playlist.
					</DialogDescription>
				</DialogHeader>

				<div class="flex flex-col gap-4 py-4 max-h-[60vh] overflow-y-auto">
					{/* Create New Playlist Section */}
					<Show
						when={isCreating()}
						fallback={
							<Button
								variant="outline"
								class="justify-start gap-2"
								onClick={() => setIsCreating(true)}
							>
								<IconPlus class="size-4" />
								Create New Playlist
							</Button>
						}
					>
						<div class="flex flex-col gap-2 p-4 border rounded-md bg-muted/30">
							<span class="text-sm font-medium">New Playlist Name</span>
							<div class="flex gap-2">
								<Input
									value={newPlaylistName()}
									onInput={(
										e: InputEvent & { currentTarget: HTMLInputElement },
									) => setNewPlaylistName(e.currentTarget.value)}
									placeholder="My Awesome Playlist"
									onKeyDown={(e: KeyboardEvent) => {
										if (e.key === "Enter") handleCreateAndAdd();
									}}
								/>
								<Button
									disabled={!newPlaylistName() || isSubmitting()}
									onClick={handleCreateAndAdd}
								>
									Create
								</Button>
							</div>
							<Button
								variant="ghost"
								size="sm"
								class="self-start h-auto p-0 text-muted-foreground"
								onClick={() => setIsCreating(false)}
							>
								Cancel
							</Button>
						</div>
					</Show>

					{/* Existing Playlists List */}
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium text-muted-foreground px-1 mb-2">
							Existing Playlists
						</span>
						<Show when={playlists.isLoading}>
							<div class="text-sm text-center py-4 text-muted-foreground">
								Loading playlists...
							</div>
						</Show>
						<For each={playlists.data}>
							{(playlist) => (
								<Button
									variant="ghost"
									class="justify-start gap-3 h-auto py-3"
									onClick={() =>
										handleAddToExisting(playlist.id, playlist.name)
									}
									disabled={isSubmitting()}
								>
									<div class="p-2 rounded bg-muted">
										<IconPlaylist class="size-4" />
									</div>
									<div class="flex flex-col items-start">
										<span class="font-medium">{playlist.name}</span>
										<span class="text-xs text-muted-foreground">
											{playlist.songCount} songs
										</span>
									</div>
								</Button>
							)}
						</For>
						<Show when={!playlists.isLoading && playlists.data?.length === 0}>
							<div class="text-sm text-center py-4 text-muted-foreground">
								No playlists found. Create one above!
							</div>
						</Show>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
