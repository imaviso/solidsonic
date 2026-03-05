import { createFileRoute } from "@tanstack/solid-router";
import { RemoteControlPanel } from "~/components/RemoteControlPanel";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

export const Route = createFileRoute("/app/remote")({
	component: RemotePage,
});

function RemotePage() {
	return (
		<div class="max-w-3xl space-y-6 p-4 md:p-6">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Remote Control</h1>
				<p class="mt-1 text-muted-foreground">
					Host this player or join another session from your phone.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Session Control</CardTitle>
					<CardDescription>
						Pair devices, control playback, seek, and jump queue positions.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RemoteControlPanel />
				</CardContent>
			</Card>
		</div>
	);
}
