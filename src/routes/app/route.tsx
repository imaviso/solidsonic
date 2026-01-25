import { createFileRoute, Outlet, redirect } from "@tanstack/solid-router";
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
import { isAuthenticated } from "~/lib/auth";

export const Route = createFileRoute("/app")({
	beforeLoad: () => {
		if (!isAuthenticated()) {
			throw redirect({ to: "/" });
		}
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset class="h-svh overflow-hidden">
				<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<SidebarTrigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 h-4" />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem class="hidden md:block">
								<BreadcrumbLink href="#">SolidSonic</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator class="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Library</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<div class="ml-auto flex items-center gap-2">
						<SearchCommand />
						<ModeToggle />
					</div>
				</header>
				<div class="flex flex-1 flex-col gap-4 p-4 overflow-hidden min-h-0 h-full">
					<Outlet />
				</div>
				<div class="shrink-0">
					<Player />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
