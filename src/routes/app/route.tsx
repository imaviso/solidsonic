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
				<div class="h-svh w-full overflow-hidden bg-background text-foreground">
					<div class="flex h-full w-full overflow-hidden border-t border-border bg-background">
						<AppSidebar />
						<SidebarInset class="flex-1 flex flex-col overflow-hidden bg-transparent">
							{/* Mobile Header */}
							<div class="shell-divider flex h-14 items-center border-b border-border bg-background px-3 shrink-0 md:hidden">
								<SidebarTrigger />
								<span class="ml-4 text-sm font-semibold tracking-[-0.04em]">
									SOLIDSONIC.
								</span>
							</div>

							<div class="flex-1 overflow-hidden px-1 py-1 md:px-2 md:py-2">
								<div class="flex h-full flex-col overflow-hidden bg-main-content">
									<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2 sm:p-4 md:p-5">
										<Suspense
											fallback={
												<div class="flex-1 animate-pulse bg-muted/10 rounded-none" />
											}
										>
											<Outlet />
										</Suspense>
									</div>
								</div>
							</div>

							{/* Player Bar */}
							<div class="z-20 shrink-0 bg-background">
								<Suspense fallback={null}>
									<Player />
								</Suspense>
							</div>
						</SidebarInset>
					</div>
				</div>
			</SidebarProvider>
		</Show>
	);
}
