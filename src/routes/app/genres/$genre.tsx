import {
	IconClock,
	IconDisc,
	IconList,
	IconPlayerPlay,
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
		<div class="flex flex-col gap-4 h-full overflow-y-auto">
			<div class="panel-surface flex flex-col gap-2 border border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
				<div class="flex flex-col gap-2">
					<span class="panel-heading text-muted-foreground">Genre</span>
					<h1 class="page-title break-words">{params().genre}</h1>
				</div>
				<Show when={songs.isFetching && !songs.isLoading}>
					<span class="text-xs text-muted-foreground">Refreshing…</span>
				</Show>
			</div>

			<Show when={!songs.isLoading} fallback={<div>Loading…</div>}>
				<div class="panel-surface overflow-auto border border-border">
					<div class="grid grid-cols-[28px_40px_minmax(0,1fr)_52px] gap-2 border-b border-border bg-background/95 px-2 py-3 text-xs font-medium tracking-[0.08em] text-muted-foreground backdrop-blur sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] sm:gap-4 sm:px-4 md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] sticky top-0 z-10">
						<div>#</div>
						<div></div>
						<div>Title</div>
						<div class="hidden md:block">Artist</div>
						<div class="hidden md:block">Album</div>
						<div class="text-right">
							<IconClock class="size-4 ml-auto" />
						</div>
					</div>
					<For each={songs.data}>
						{(song, i) => (
							<ContextMenu>
								<ContextMenuTrigger>
									<button
										type="button"
										class="w-full h-[60px] grid grid-cols-[28px_40px_minmax(0,1fr)_52px] sm:grid-cols-[40px_48px_minmax(0,1fr)_80px] md:grid-cols-[40px_48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-2 sm:gap-4 px-2 sm:px-4 items-center group cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/50 bg-transparent text-left rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={() => {
											const songList = songs.data;
											if (songList) {
												play(song, songList, i());
											}
										}}
									>
										<div class="font-medium text-muted-foreground group-hover:text-foreground">
											<span class="text-xs">{i() + 1}</span>
										</div>
										<CoverArt
											id={song.coverArt}
											size={80}
											class="size-10 rounded-none border border-border"
										/>
										<div class="font-medium truncate">
											<span
												class={
													currentTrack?.id === song.id ? "text-primary" : ""
												}
											>
												{song.title}
											</span>
										</div>
										<div class="hidden md:block truncate text-muted-foreground">
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
										</div>
										<div class="hidden md:block truncate text-muted-foreground">
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
										</div>
										<div class="text-right font-mono text-xs text-muted-foreground">
											{formatDuration(song.duration)}
										</div>
									</button>
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
										Add to Playlist…
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
											<IconStarFilled class="mr-2 size-4 text-warning" />
										</Show>
										{song.starred ? "Unstar" : "Star"}
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						)}
					</For>
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
