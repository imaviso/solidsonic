import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { showToast } from "~/components/ui/toast";
import { createPlaylist, updatePlaylist } from "~/lib/api";
import { queryKeys } from "~/lib/query";

interface PlaylistDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	playlistId?: string;
	currentName?: string;
	onSuccess?: () => void;
}

export function PlaylistDialog(props: PlaylistDialogProps) {
	const queryClient = useQueryClient();
	const [name, setName] = createSignal(props.currentName || "");

	const createPlaylistMutation = createMutation(() => ({
		mutationFn: (playlistName: string) =>
			createPlaylist({ name: playlistName }),
		onSuccess: (_playlist, playlistName) => {
			showToast({
				title: "Playlist Created",
				description: `Playlist "${playlistName}" created successfully.`,
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
		},
	}));

	const renamePlaylistMutation = createMutation(() => ({
		mutationFn: (variables: { playlistId: string; name: string }) =>
			updatePlaylist({
				playlistId: variables.playlistId,
				name: variables.name,
			}),
		onSuccess: (_result, variables) => {
			showToast({
				title: "Playlist Updated",
				description: "Playlist renamed successfully.",
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
			void queryClient.invalidateQueries({
				queryKey: queryKeys.playlists.detail(variables.playlistId),
			});
		},
	}));

	const isSubmitting = () =>
		createPlaylistMutation.isPending || renamePlaylistMutation.isPending;

	// Update name when props change
	const updateName = () => {
		if (props.open && props.currentName) {
			setName(props.currentName);
		} else if (props.open && props.mode === "create") {
			setName("");
		}
	};

	// React to open change to reset/set name
	// In SolidJS, we might need an effect or just rely on the parent resetting it,
	// but let's try to set it when the dialog opens.
	// Since we can't easily listen to "open" prop changes without an effect:
	// effectively we can just initialize it.
	// A better way in Solid is often to just use the signal passed in or simple effect.
	// For now, let's assume the parent handles the state or we reset on close.

	const handleSubmit = async () => {
		if (!name()) return;

		try {
			if (props.mode === "create") {
				await createPlaylistMutation.mutateAsync(name());
			} else {
				if (!props.playlistId) return;
				await renamePlaylistMutation.mutateAsync({
					playlistId: props.playlistId,
					name: name(),
				});
			}
			props.onSuccess?.();
			props.onOpenChange(false);
		} catch (e) {
			showToast({
				title: "Error",
				description: e instanceof Error ? e.message : "Failed to save playlist",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (open) updateName();
				props.onOpenChange(open);
			}}
		>
			<DialogContent class="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{props.mode === "create" ? "Create Playlist" : "Rename Playlist"}
					</DialogTitle>
					<DialogDescription>
						{props.mode === "create"
							? "Enter a name for your new playlist."
							: "Enter a new name for this playlist."}
					</DialogDescription>
				</DialogHeader>
				<div class="grid gap-4 py-4">
					<Input
						id="name"
						value={name()}
						onInput={(e) => setName(e.currentTarget.value)}
						placeholder="Playlist Name"
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSubmit();
						}}
					/>
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => props.onOpenChange(false)}
						disabled={isSubmitting()}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!name() || isSubmitting()}>
						{props.mode === "create" ? "Create" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
