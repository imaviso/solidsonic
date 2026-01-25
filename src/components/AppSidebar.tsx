import {
	IconDisc,
	IconHome,
	IconLayoutGrid,
	IconMicrophone2,
	IconMusic,
	IconPlaylist,
	IconSettings,
} from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { Link, useLocation } from "@tanstack/solid-router";
import { type Component, For } from "solid-js";
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
} from "~/components/ui/sidebar";
import { playlistListQueryOptions } from "~/lib/api";

const AppSidebar: Component = () => {
	const location = useLocation();

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

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div class="flex items-center gap-2 px-2 py-1 text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
					<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<IconMusic class="size-4" />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
						<span class="truncate font-semibold">SolidSonic</span>
						<span class="truncate text-xs">Music Player</span>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
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
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton as={Link} to="/app/settings" tooltip="Settings">
							<IconSettings />
							<span>Settings</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
};

export default AppSidebar;
