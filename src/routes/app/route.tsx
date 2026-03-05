import { createFileRoute, Outlet, redirect } from "@tanstack/solid-router";
import { createSignal, onMount, Show, Suspense } from "solid-js";
import AppSidebar from "~/components/AppSidebar";
import Player from "~/components/Player";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { playlistListQueryOptions } from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";
import {
	enableQueueSync,
	isQueueSyncEnabled,
	restoreQueue,
} from "~/lib/player";

export const Route = createFileRoute("/app")({
	beforeLoad: () => {
		if (!isAuthenticated()) {
			throw redirect({ to: "/" });
		}
	},
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(playlistListQueryOptions()),
	component: AppLayout,
});

function AppLayout() {
	const [mounted, setMounted] = createSignal(false);

	onMount(() => {
		setMounted(true);

		if (!isQueueSyncEnabled()) {
			enableQueueSync();
			void restoreQueue();
		}
	});

	return (
		<Show when={mounted()}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset class="h-svh overflow-hidden flex flex-col">
					{/* Mobile Header */}
					<div class="md:hidden flex items-center h-14 px-4 border-b shrink-0 bg-background">
						<SidebarTrigger />
						<span class="ml-4 font-semibold">SolidSonic</span>
					</div>
					<div class="flex flex-1 flex-col gap-4 p-4 overflow-hidden min-h-0 h-full">
						<Suspense
							fallback={
								<div class="flex-1 animate-pulse bg-muted/10 rounded-lg" />
							}
						>
							<Outlet />
						</Suspense>
					</div>
					<div class="shrink-0">
						<Suspense fallback={null}>
							<Player />
						</Suspense>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</Show>
	);
}
