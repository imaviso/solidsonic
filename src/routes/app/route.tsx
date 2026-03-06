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
				<div class="h-svh w-full flex bg-background text-foreground overflow-hidden">
					<AppSidebar />
					<SidebarInset class="flex-1 flex flex-col overflow-hidden bg-background">
						{/* Mobile Header */}
						<div class="md:hidden flex items-center h-14 px-3 border-b-2 border-border shrink-0 bg-background">
							<SidebarTrigger />
							<span class="ml-4 font-semibold">SolidSonic</span>
						</div>

						{/* Main Content Area (M3 Surface Container) */}
						<div class="flex-1 flex flex-col bg-muted/30 md:mx-2 md:mt-2 md:rounded-t-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden relative">
							<div class="flex flex-1 flex-col gap-3 sm:gap-4 p-2 sm:p-6 overflow-hidden min-h-0 h-full relative">
								<Suspense
									fallback={
										<div class="flex-1 animate-pulse bg-muted/10 rounded-2xl" />
									}
								>
									<Outlet />
								</Suspense>
							</div>
						</div>

						{/* Player Bar */}
						<div class="shrink-0 bg-background z-20">
							<Suspense fallback={null}>
								<Player />
							</Suspense>
						</div>
					</SidebarInset>
				</div>
			</SidebarProvider>
		</Show>
	);
}
