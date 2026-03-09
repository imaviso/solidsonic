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
		<div class="mx-auto w-full max-w-4xl space-y-4 p-3 pb-24 sm:space-y-6 sm:p-4 md:p-6 md:pb-6">
			<div class="panel-surface border border-border px-5 py-5 sm:px-6">
				<div class="panel-heading mb-3">Pairing</div>
				<h1 class="page-title text-foreground">Remote Control</h1>
				<p class="mt-1 max-w-prose text-sm text-muted-foreground sm:text-base">
					Host this player or join another session from your phone.
				</p>
			</div>

			<Card class="overflow-hidden">
				<CardHeader class="p-4 pb-3 sm:p-6 sm:pb-4">
					<CardTitle class="text-base sm:text-lg">Session Control</CardTitle>
					<CardDescription>
						Pair devices, control playback, seek, and jump queue positions.
					</CardDescription>
				</CardHeader>
				<CardContent class="p-4 pt-0 sm:p-6 sm:pt-0">
					<RemoteControlPanel />
				</CardContent>
			</Card>
		</div>
	);
}
