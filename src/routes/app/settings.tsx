import { createFileRoute } from "@tanstack/solid-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useSettings } from "~/lib/settings";

export const Route = createFileRoute("/app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { settings, setAudioBackend } = useSettings();

	return (
		<div class="container max-w-2xl py-8 space-y-8">
			<div>
				<h2 class="text-3xl font-bold tracking-tight">Settings</h2>
				<p class="text-muted-foreground">Manage your player preferences</p>
			</div>

			<div class="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Audio Playback</CardTitle>
						<CardDescription>Configure how music is played</CardDescription>
					</CardHeader>
					<CardContent class="space-y-6">
						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Audio Backend</Label>
								<p class="text-sm text-muted-foreground">
									Choose the audio engine. MPV provides better format support
									(Electron only).
								</p>
							</div>
							<Select
								value={settings.audioBackend}
								onChange={(value) =>
									value && setAudioBackend(value as "html5" | "mpv")
								}
								options={["html5", "mpv"]}
								placeholder="Select backend"
								itemComponent={(props) => (
									<SelectItem item={props.item}>
										{props.item.rawValue === "html5"
											? "HTML5 Audio"
											: "MPV (Native)"}
									</SelectItem>
								)}
							>
								<SelectTrigger class="w-[180px]">
									<SelectValue<string>>
										{(state) =>
											state.selectedOption() === "html5"
												? "HTML5 Audio"
												: "MPV (Native)"
										}
									</SelectValue>
								</SelectTrigger>
								<SelectContent />
							</Select>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
