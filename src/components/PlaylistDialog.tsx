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

interface PlaylistDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	playlistId?: string;
	currentName?: string;
	onSuccess?: () => void;
}

export function PlaylistDialog(props: PlaylistDialogProps) {
	const [name, setName] = createSignal(props.currentName || "");
	const [isSubmitting, setIsSubmitting] = createSignal(false);

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

		setIsSubmitting(true);
		try {
			if (props.mode === "create") {
				await createPlaylist({
					name: name(),
				});
				showToast({
					title: "Playlist Created",
					description: `Playlist "${name()}" created successfully.`,
				});
			} else {
				if (!props.playlistId) return;
				await updatePlaylist({
					playlistId: props.playlistId,
					name: name(),
				});
				showToast({
					title: "Playlist Updated",
					description: "Playlist renamed successfully.",
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
		} finally {
			setIsSubmitting(false);
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
