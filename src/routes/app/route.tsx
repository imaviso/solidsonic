import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/solid-router";
import {
	createMemo,
	createSignal,
	For,
	onMount,
	Show,
	Suspense,
} from "solid-js";
import AppSidebar from "~/components/AppSidebar";
import ModeToggle from "~/components/ModeToggle";
import Player from "~/components/Player";
import { SearchCommand } from "~/components/SearchCommand";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { playlistListQueryOptions } from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";

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
	const location = useLocation();
	const [mounted, setMounted] = createSignal(false);

	onMount(() => {
		setMounted(true);
	});

	const breadcrumbs = createMemo(() => {
		const parts = location().pathname.split("/").filter(Boolean);
		return parts.map((part, index) => {
			const href = `/${parts.slice(0, index + 1).join("/")}`;
			// Decode URI components and handle IDs/special cases
			let label = decodeURIComponent(part);
			label = label.charAt(0).toUpperCase() + label.slice(1);

			// Replace common route segments with nicer labels
			if (label === "App") label = "SolidSonic";

			return {
				label,
				href,
				isLast: index === parts.length - 1,
			};
		});
	});

	return (
		<Show when={mounted()}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset class="h-svh overflow-hidden">
					<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
						<SidebarTrigger class="-ml-1" />
						<Separator orientation="vertical" class="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<For each={breadcrumbs()}>
									{(crumb, i) => (
										<>
											<BreadcrumbItem
												class={i() === 0 ? "hidden md:block" : ""}
											>
												<Show
													when={!crumb.isLast}
													fallback={
														<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
													}
												>
													<BreadcrumbLink as={Link} href={crumb.href}>
														{crumb.label}
													</BreadcrumbLink>
												</Show>
											</BreadcrumbItem>
											<Show when={!crumb.isLast}>
												<BreadcrumbSeparator
													class={i() === 0 ? "hidden md:block" : ""}
												/>
											</Show>
										</>
									)}
								</For>
							</BreadcrumbList>
						</Breadcrumb>
						<div class="ml-auto flex items-center gap-2">
							<SearchCommand />
							<ModeToggle />
						</div>
					</header>
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
