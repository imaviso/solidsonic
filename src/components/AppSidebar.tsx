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
				<div class="hidden items-center gap-2 px-3 pt-3 pb-2 text-sidebar-foreground group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
					<SidebarTrigger class="size-8 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
				</div>
				<div class="flex items-center gap-2 px-3 pt-3 pb-2 text-sidebar-foreground group-data-[collapsible=icon]:hidden">
					<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
						<IconMusic class="size-4" />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight">
						<span class="truncate font-semibold">SolidSonic</span>
						<span class="truncate text-xs text-sidebar-foreground/70">
							Music Player
						</span>
					</div>
					<SidebarTrigger class="size-8 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
				</div>
				<div class="px-3 pb-3 group-data-[collapsible=icon]:hidden">
					<SearchCommand triggerClass="w-full" showShortcut={false} />
				</div>
				<SidebarSeparator class="mx-3" />
			</SidebarHeader>
			<SidebarContent class="pt-1">
				<SidebarGroup>
					<SidebarGroupLabel>Library</SidebarGroupLabel>
					<SidebarGroupContent>
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

				<SidebarGroup>
					<SidebarGroupLabel>Playlists</SidebarGroupLabel>
					<SidebarGroupContent>
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
							<For each={playlistsQuery.data?.slice(0, 5)}>
								{(playlist) => (
									<SidebarMenuItem>
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
			<SidebarFooter class="h-20 border-t border-border p-2">
				<SidebarMenu class="my-auto">
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger
								as={SidebarMenuButton<"button">}
								class="h-10"
								tooltip="Account"
							>
								<Avatar class="size-6 rounded-md">
									<AvatarFallback class="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-semibold">
										{userInitials()}
									</AvatarFallback>
								</Avatar>
								<div class="min-w-0 text-left group-data-[collapsible=icon]:hidden">
									<p class="truncate text-sm font-medium leading-tight">
										{username()}
									</p>
									<p class="truncate text-xs text-sidebar-foreground/70 leading-tight">
										{serverHost()}
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
