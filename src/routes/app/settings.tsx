import { createFileRoute } from "@tanstack/solid-router";
import { RemoteControlPanel } from "~/components/RemoteControlPanel";
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
import { Switch, SwitchControl, SwitchThumb } from "~/components/ui/switch";
import { useSettings } from "~/lib/settings";

export const Route = createFileRoute("/app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { settings, setTheme, setMaxBitRate, setScrobblingEnabled } =
		useSettings();

	return (
		<div class="container max-w-2xl py-6 sm:py-8 space-y-6 sm:space-y-8 h-full overflow-y-auto">
			<div>
				<h2 class="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
				<p class="text-muted-foreground">Manage your player preferences</p>
			</div>

			<div class="grid gap-6">
				{/* Appearance */}
				<Card>
					<CardHeader>
						<CardTitle>Appearance</CardTitle>
						<CardDescription>
							Customize how the application looks
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-6">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="space-y-0.5">
								<Label>Theme</Label>
								<p class="text-sm text-muted-foreground">
									Select the color theme for the interface.
								</p>
							</div>
							<Select
								value={settings.theme}
								onChange={(value) =>
									value && setTheme(value as "light" | "dark" | "system")
								}
								options={["light", "dark", "system"]}
								placeholder="Select theme"
								itemComponent={(props) => (
									<SelectItem item={props.item}>
										{props.item.rawValue.charAt(0).toUpperCase() +
											props.item.rawValue.slice(1)}
									</SelectItem>
								)}
							>
								<SelectTrigger class="h-11 sm:h-10 w-full sm:w-[180px]">
									<SelectValue<string>>
										{(state) => {
											const val = state.selectedOption();
											return val
												? val.charAt(0).toUpperCase() + val.slice(1)
												: "System";
										}}
									</SelectValue>
								</SelectTrigger>
								<SelectContent />
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Audio Playback */}
				<Card>
					<CardHeader>
						<CardTitle>Audio Playback</CardTitle>
						<CardDescription>Configure how music is played</CardDescription>
					</CardHeader>
					<CardContent class="space-y-6">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="space-y-0.5">
								<Label>Max Bitrate</Label>
								<p class="text-sm text-muted-foreground">
									Limit audio quality to save bandwidth (0 = Unlimited).
								</p>
							</div>
							<Select
								value={settings.maxBitRate}
								onChange={(value) => setMaxBitRate(value as number)}
								options={[0, 320, 256, 192, 128]}
								placeholder="Select bitrate"
								itemComponent={(props) => (
									<SelectItem item={props.item}>
										{props.item.rawValue === 0
											? "Unlimited"
											: `${props.item.rawValue} kbps`}
									</SelectItem>
								)}
							>
								<SelectTrigger class="h-11 sm:h-10 w-full sm:w-[180px]">
									<SelectValue<number>>
										{(state) =>
											state.selectedOption() === 0
												? "Unlimited"
												: `${state.selectedOption()} kbps`
										}
									</SelectValue>
								</SelectTrigger>
								<SelectContent />
							</Select>
						</div>

						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="space-y-0.5">
								<Label>Scrobbling</Label>
								<p class="text-sm text-muted-foreground">
									Submit played songs to the server (Last.fm/ListenBrainz if
									configured).
								</p>
							</div>
							<Switch
								checked={settings.scrobblingEnabled}
								onChange={setScrobblingEnabled}
							>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</Switch>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Remote Control</CardTitle>
						<CardDescription>
							Pair this player with your phone to control playback remotely.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RemoteControlPanel />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
