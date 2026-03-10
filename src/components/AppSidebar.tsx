import {
	IconDisc,
	IconHome,
	IconLayoutGrid,
	IconLogout2,
	IconMicrophone2,
	IconMusic,
	IconPlaylist,
	IconSettings,
} from "@tabler/icons-solidjs";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { type Component, For, Show } from "solid-js";
import { SearchCommand } from "~/components/SearchCommand";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { playlistListQueryOptions, playlistQueryOptions } from "~/lib/api";
import { useAuth } from "~/lib/auth";

const AppSidebar: Component = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const auth = useAuth();

	// Use query for playlists to cache and manage state better
	const playlistsQuery = useQuery(() => playlistListQueryOptions());

	const navMain = [
		{
			title: "Discover",
			url: "/app",
			icon: IconHome,
		},
		{
			title: "Artists",
			url: "/app/artists",
			icon: IconMicrophone2,
		},
		{
			title: "Albums",
			url: "/app/albums",
			icon: IconDisc,
		},
		{
			title: "Songs",
			url: "/app/songs",
			icon: IconMusic,
		},
		{
			title: "Genres",
			url: "/app/genres",
			icon: IconLayoutGrid,
		},
	];

	const username = () => auth.credentials?.username ?? "User";
	const userInitials = () => username().slice(0, 2).toUpperCase();
	const serverHost = () => {
		const serverUrl = auth.credentials?.serverUrl;
		if (!serverUrl) return "";
		try {
			return new URL(serverUrl).host;
		} catch {
			return serverUrl;
		}
	};

	const handleLogout = () => {
		auth.logout();
		queryClient.clear();
		navigate({ to: "/" });
	};

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader class="gap-0 p-0">
				<div class="hidden items-center justify-center px-3 py-3 text-sidebar-foreground group-data-[collapsible=icon]:flex">
					<SidebarTrigger class="size-9 border border-border bg-background text-sidebar-foreground/80 hover:text-sidebar-foreground" />
				</div>
				<div class="group-data-[collapsible=icon]:hidden">
					<div class="shell-divider px-4 py-4 text-sidebar-foreground">
						<div class="flex items-start gap-3">
							<div class="flex aspect-square size-11 items-center justify-center rounded-none border border-border bg-sidebar-primary text-sidebar-primary-foreground">
								<IconMusic class="size-4" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="panel-heading mb-1">Music Control</div>
								<div class="text-base font-semibold tracking-[-0.04em] text-sidebar-foreground">
									SOLIDSONIC.
								</div>
							</div>
							<SidebarTrigger class="size-9 border border-border bg-background text-sidebar-foreground/80 hover:text-sidebar-foreground" />
						</div>
					</div>
				</div>
				<div class="px-4 py-4 group-data-[collapsible=icon]:hidden">
					<SearchCommand triggerClass="w-full" showShortcut={true} />
				</div>
				<SidebarSeparator class="mx-0" />
			</SidebarHeader>
			<SidebarContent class="gap-4 px-4 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
				<SidebarGroup class="p-0 group-data-[collapsible=icon]:items-center">
					<SidebarGroupLabel>Library</SidebarGroupLabel>
					<SidebarGroupContent class="panel-surface border border-border bg-sidebar p-1 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
						<SidebarMenu>
							<For each={navMain}>
								{(item) => (
									<SidebarMenuItem>
										<SidebarMenuButton
											as={Link}
											to={item.url}
											preload="intent"
											isActive={location().pathname === item.url}
											tooltip={item.title}
										>
											<item.icon />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)}
							</For>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup class="p-0 group-data-[collapsible=icon]:items-center">
					<SidebarGroupLabel>Playlists</SidebarGroupLabel>
					<SidebarGroupContent class="panel-surface border border-border bg-sidebar p-1 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									as={Link}
									to="/app/playlists"
									tooltip="All Playlists"
								>
									<IconPlaylist />
									<span>All Playlists</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<Show
								when={!playlistsQuery.isLoading && !playlistsQuery.data?.length}
							>
								<li class="px-3 py-3 text-sm text-muted-foreground">
									No playlists yet.
								</li>
							</Show>
							<For each={playlistsQuery.data?.slice(0, 5)}>
								{(playlist) => (
									<SidebarMenuItem class="group-data-[collapsible=icon]:hidden">
										<SidebarMenuButton
											as={Link}
											to={`/app/playlists/${playlist.id}`}
											preload="intent"
											onPointerEnter={() => {
												void queryClient.prefetchQuery(
													playlistQueryOptions(playlist.id),
												);
											}}
											isActive={
												location().pathname === `/app/playlists/${playlist.id}`
											}
										>
											<span>{playlist.name}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)}
							</For>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter class="border-t border-border p-4 group-data-[collapsible=icon]:p-2">
				<SidebarMenu class="my-auto">
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger
								as={SidebarMenuButton<"button">}
								class="panel-surface h-auto border border-border bg-sidebar px-3 py-3"
								tooltip="Account"
							>
								<Avatar class="size-8 rounded-none border border-border">
									<AvatarFallback class="rounded-none bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
										{userInitials()}
									</AvatarFallback>
								</Avatar>
								<div class="min-w-0 text-left group-data-[collapsible=icon]:hidden">
									<p class="truncate text-sm font-medium leading-tight">
										{username()}
									</p>
									<p class="mt-1 text-xs text-sidebar-foreground/72 leading-tight">
										{serverHost() || "Local session"}
									</p>
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent class="w-56">
								<DropdownMenuLabel>{username()}</DropdownMenuLabel>
								<Show when={serverHost()}>
									<DropdownMenuLabel class="pt-0 text-xs font-normal text-muted-foreground">
										{serverHost()}
									</DropdownMenuLabel>
								</Show>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() => navigate({ to: "/app/settings" })}
								>
									<IconSettings class="size-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={handleLogout}
									class="text-destructive focus:text-destructive"
								>
									<IconLogout2 class="size-4" />
									Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
};

export default AppSidebar;
