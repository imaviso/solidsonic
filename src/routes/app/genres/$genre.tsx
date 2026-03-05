import {
	IconClock,
	IconDisc,
	IconList,
	IconPlayerPlay,
	IconPlayerPlayFilled,
	IconPlayerSkipForward,
	IconPlaylistAdd,
	IconStar,
	IconStarFilled,
	IconUser,
} from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { AddToPlaylistDialog } from "~/components/AddToPlaylistDialog";
import CoverArt from "~/components/CoverArt";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Button } from "~/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { genreSongsQueryOptions, star, unstar } from "~/lib/api";
import { usePlayer } from "~/lib/player";

const PAGE_SIZE = 100;

export const Route = createFileRoute("/app/genres/$genre")({
	validateSearch: (search: Record<string, unknown>): { page?: number } => {
		const rawPage = Number(search.page);
		const page =
			Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
		if (page <= 1) {
			return {};
		}
		return { page };
	},
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: ({ context: { queryClient }, params, deps }) =>
		queryClient.ensureQueryData(
			genreSongsQueryOptions(
				params.genre,
				PAGE_SIZE,
				(deps.page - 1) * PAGE_SIZE,
			),
		),
	errorComponent: ErrorComponent,
	component: GenreDetailPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function GenreDetailPage() {
	const params = Route.useParams();
	const {
		playSong: play,
		currentTrack,
		playNextInQueue,
		addToQueue,
	} = usePlayer();
	const navigate = useNavigate();
	const search = Route.useSearch();
	const [playlistDialogState, setPlaylistDialogState] = createStore<{
		open: boolean;
		songIds: string[];
	}>({
		open: false,
		songIds: [],
	});

	const page = () => search().page ?? 1;
	const offset = () => (page() - 1) * PAGE_SIZE;

	const songs = useQuery(() =>
		genreSongsQueryOptions(params().genre, PAGE_SIZE, offset()),
	);

	const hasNextPage = () => (songs.data?.length ?? 0) === PAGE_SIZE;

	const goToPage = (nextPage: number) => {
		navigate({
			to: "/app/genres/$genre",
			params: { genre: params().genre },
			search: nextPage > 1 ? { page: nextPage } : {},
			replace: true,
		});
	};

	return (
		<div class="flex flex-col gap-6 h-full overflow-y-auto">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div class="flex flex-col gap-2">
					<span class="text-sm font-medium text-muted-foreground uppercase">
						Genre
					</span>
					<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
						{params().genre}
					</h1>
				</div>
				<Show when={songs.isFetching && !songs.isLoading}>
					<span class="text-xs text-muted-foreground">Refreshing...</span>
				</Show>
			</div>

			<Show when={!songs.isLoading} fallback={<div>Loading...</div>}>
				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[50px]">#</TableHead>
								<TableHead class="w-[48px]"></TableHead>
								<TableHead>Title</TableHead>
								<TableHead class="hidden md:table-cell">Artist</TableHead>
								<TableHead class="hidden md:table-cell">Album</TableHead>
								<TableHead class="text-right">
									<IconClock class="size-4 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<For each={songs.data}>
								{(song, i) => (
									<ContextMenu>
										<ContextMenuTrigger
											as={TableRow}
											class="group cursor-pointer hover:bg-muted/50"
											onClick={() => {
												const songList = songs.data;
												if (songList) {
													play(song, songList, i());
												}
											}}
										>
											<TableCell class="font-medium text-muted-foreground group-hover:text-foreground">
												<span class="group-hover:hidden text-xs">
													{i() + 1}
												</span>
												<IconPlayerPlayFilled class="size-3 hidden group-hover:block text-primary" />
											</TableCell>
											<TableCell>
												<CoverArt
													id={song.coverArt}
													size={80}
													class="size-10 rounded shadow-sm"
												/>
											</TableCell>
											<TableCell class="font-medium">
												<span
													class={
														currentTrack?.id === song.id ? "text-primary" : ""
													}
												>
													{song.title}
												</span>
											</TableCell>
											<TableCell class="hidden md:table-cell">
												<Show when={song.artistId} fallback={song.artist}>
													<Link
														to="/app/artists/$id"
														params={{ id: song.artistId ?? "" }}
														class="hover:text-foreground hover:underline"
														onClick={(e) => e.stopPropagation()}
													>
														{song.artist}
													</Link>
												</Show>
											</TableCell>
											<TableCell class="hidden md:table-cell">
												<Show when={song.albumId} fallback={song.album}>
													<Link
														to="/app/albums/$id"
														params={{ id: song.albumId ?? "" }}
														class="hover:text-foreground hover:underline"
														onClick={(e) => e.stopPropagation()}
													>
														{song.album}
													</Link>
												</Show>
											</TableCell>
											<TableCell class="text-right font-mono text-xs text-muted-foreground">
												{formatDuration(song.duration)}
											</TableCell>
										</ContextMenuTrigger>
										<ContextMenuContent>
											<ContextMenuItem
												onSelect={() => {
													const songList = songs.data;
													if (songList) {
														play(song, songList, i());
													}
												}}
											>
												<IconPlayerPlay class="mr-2 size-4" />
												Play
											</ContextMenuItem>
											<ContextMenuItem onSelect={() => playNextInQueue(song)}>
												<IconPlayerSkipForward class="mr-2 size-4" />
												Play Next
											</ContextMenuItem>
											<ContextMenuItem onSelect={() => addToQueue([song])}>
												<IconList class="mr-2 size-4" />
												Add to Queue
											</ContextMenuItem>
											<ContextMenuItem
												onSelect={() => {
													setPlaylistDialogState({
														open: true,
														songIds: [song.id],
													});
												}}
											>
												<IconPlaylistAdd class="mr-2 size-4" />
												Add to Playlist...
											</ContextMenuItem>
											<ContextMenuSeparator />
											<ContextMenuItem
												onSelect={() => {
													if (song.artistId) {
														navigate({
															to: "/app/artists/$id",
															params: { id: song.artistId },
														});
													}
												}}
												disabled={!song.artistId}
											>
												<IconUser class="mr-2 size-4" />
												Go to Artist
											</ContextMenuItem>
											<ContextMenuItem
												onSelect={() => {
													if (song.albumId) {
														navigate({
															to: "/app/albums/$id",
															params: { id: song.albumId },
														});
													}
												}}
												disabled={!song.albumId}
											>
												<IconDisc class="mr-2 size-4" />
												Go to Album
											</ContextMenuItem>
											<ContextMenuSeparator />
											<ContextMenuItem
												onSelect={() => {
													if (song.starred) {
														unstar({ id: song.id });
													} else {
														star({ id: song.id });
													}
												}}
											>
												<Show
													when={song.starred}
													fallback={<IconStar class="mr-2 size-4" />}
												>
													<IconStarFilled class="mr-2 size-4 text-yellow-500" />
												</Show>
												{song.starred ? "Unstar" : "Star"}
											</ContextMenuItem>
										</ContextMenuContent>
									</ContextMenu>
								)}
							</For>
						</TableBody>
					</Table>
				</div>

				<div class="flex items-center justify-between pt-2">
					<Button
						variant="outline"
						size="sm"
						class="h-11 sm:h-9"
						onClick={() => goToPage(page() - 1)}
						disabled={page() <= 1 || songs.isFetching}
					>
						Previous
					</Button>
					<span class="text-sm text-muted-foreground">Page {page()}</span>
					<Button
						variant="outline"
						size="sm"
						class="h-11 sm:h-9"
						onClick={() => goToPage(page() + 1)}
						disabled={!hasNextPage() || songs.isFetching}
					>
						Next
					</Button>
				</div>
			</Show>

			<AddToPlaylistDialog
				open={playlistDialogState.open}
				onOpenChange={(open) => setPlaylistDialogState("open", open)}
				songIds={playlistDialogState.songIds}
			/>
		</div>
	);
}
