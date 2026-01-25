import { IconPlayerPlayFilled } from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import CoverArt from "~/components/CoverArt";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "~/components/ui/carousel";
import {
	type AlbumListType,
	getAlbumList,
	getGenres,
	getStarred,
	type Song,
} from "~/lib/api";
import { usePlayer } from "~/lib/player";

export const Route = createFileRoute("/app/")({
	component: DashboardPage,
});

function formatDuration(seconds?: number) {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AlbumCarouselSkeleton() {
	return (
		<Carousel
			opts={{
				align: "start",
			}}
			class="w-full md:w-auto md:mx-12"
		>
			<CarouselContent>
				<For each={Array(6).fill(0)}>
					{(_) => (
						<CarouselItem class="basis-[160px] md:basis-[200px]">
							<div class="block">
								<Card class="border-0 shadow-none bg-transparent">
									<CardContent class="p-0">
										<div class="aspect-square rounded-md bg-muted animate-pulse" />
										<div class="pt-2 space-y-2">
											<div class="h-4 w-3/4 bg-muted animate-pulse rounded" />
											<div class="h-3 w-1/2 bg-muted animate-pulse rounded" />
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					)}
				</For>
			</CarouselContent>
			<CarouselPrevious class="hidden md:flex" />
			<CarouselNext class="hidden md:flex" />
		</Carousel>
	);
}

function AlbumSection(props: { title: string; type: AlbumListType }) {
	const albums = useQuery(() => ({
		queryKey: ["albums", props.type],
		queryFn: () => getAlbumList(props.type, 12),
	}));

	return (
		<div class="min-w-0">
			<div class="flex items-center justify-between mb-4 px-1">
				<h2 class="text-2xl font-bold tracking-tight">{props.title}</h2>
			</div>
			<Show when={!albums.isLoading} fallback={<AlbumCarouselSkeleton />}>
				<Show
					when={albums.data && albums.data.length > 0}
					fallback={
						<div class="text-muted-foreground text-sm italic px-1">
							No albums found.
						</div>
					}
				>
					<Carousel
						opts={{
							align: "start",
						}}
						class="w-full md:w-auto md:mx-12"
					>
						<CarouselContent>
							<For each={albums.data}>
								{(album) => (
									<CarouselItem class="basis-[160px] md:basis-[200px]">
										<Link
											to="/app/albums/$id"
											params={{ id: album.id }}
											class="block group"
										>
											<Card class="border-0 shadow-none bg-transparent">
												<CardContent class="p-0">
													<div class="aspect-square w-full relative overflow-hidden rounded-md shadow-sm bg-muted">
														<CoverArt
															id={album.coverArt}
															class="h-full w-full object-cover"
														/>
													</div>
													<div class="pt-2">
														<h3 class="font-medium truncate group-hover:underline">
															{album.name}
														</h3>
														<p class="text-xs text-muted-foreground truncate">
															{album.artist}
														</p>
													</div>
												</CardContent>
											</Card>
										</Link>
									</CarouselItem>
								)}
							</For>
						</CarouselContent>
						<CarouselPrevious class="hidden md:flex" />
						<CarouselNext class="hidden md:flex" />
					</Carousel>
				</Show>
			</Show>
		</div>
	);
}

function StarredSongsSection() {
	const { playSong: play, currentTrack } = usePlayer();
	const starred = useQuery(() => ({
		queryKey: ["starred"],
		queryFn: getStarred,
	}));

	const handlePlaySong = (song: Song, index: number) => {
		const songList = starred.data?.songs || [];
		play(song, songList, index);
	};

	return (
		<div class="min-w-0">
			<h2 class="text-2xl font-bold tracking-tight mb-4 px-1">
				Favorite Songs
			</h2>
			<Show
				when={!starred.isLoading}
				fallback={
					<div class="space-y-2 px-1">
						<div class="h-10 bg-muted animate-pulse rounded" />
						<div class="h-10 bg-muted animate-pulse rounded" />
					</div>
				}
			>
				<div class="flex flex-col gap-1 px-1">
					<For each={starred.data?.songs?.slice(0, 5)}>
						{(song, i) => (
							<button
								type="button"
								class="grid grid-cols-[30px_1fr_1fr_60px] gap-2 px-3 py-2 items-center rounded-md hover:bg-muted/50 group cursor-pointer text-sm w-full text-left"
								onClick={() => handlePlaySong(song, i())}
							>
								<div class="text-muted-foreground text-xs group-hover:text-primary flex justify-center">
									<span class="group-hover:hidden">{i() + 1}</span>
									<IconPlayerPlayFilled class="size-3 hidden group-hover:block" />
								</div>
								<div class="font-medium truncate">
									<span
										class={currentTrack?.id === song.id ? "text-primary" : ""}
									>
										{song.title}
									</span>
								</div>
								<div class="truncate text-muted-foreground">{song.artist}</div>
								<div class="text-right font-mono text-xs text-muted-foreground">
									{formatDuration(song.duration)}
								</div>
							</button>
						)}
					</For>
					<Show when={starred.data?.songs?.length === 0}>
						<div class="text-muted-foreground text-sm italic">
							No favorite songs yet.
						</div>
					</Show>
					<Show when={(starred.data?.songs?.length ?? 0) > 5}>
						<div class="pt-2">
							<Link
								to="/app/songs"
								class="text-xs text-primary hover:underline"
							>
								View all songs
							</Link>
						</div>
					</Show>
				</div>
			</Show>
		</div>
	);
}

function GenreSection() {
	const genres = useQuery(() => ({
		queryKey: ["genres"],
		queryFn: getGenres,
	}));

	return (
		<div class="min-w-0">
			<h2 class="text-2xl font-bold tracking-tight mb-4 px-1">Genres</h2>
			<Show
				when={!genres.isLoading}
				fallback={<div class="h-10 bg-muted animate-pulse rounded" />}
			>
				<div class="flex flex-wrap gap-2 px-1">
					<For each={genres.data?.slice(0, 20) ?? []}>
						{(genre) => (
							<Link to="/app/genres/$genre" params={{ genre: genre.value }}>
								<Badge
									variant="secondary"
									class="text-sm px-3 py-1 hover:bg-secondary/80 cursor-pointer"
								>
									{genre.value}
								</Badge>
							</Link>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}

function DashboardPage() {
	return (
		<div class="flex flex-col gap-10 pb-10 h-full overflow-y-auto">
			<AlbumSection title="New Arrivals" type="newest" />
			<StarredSongsSection />
			<AlbumSection title="Recently Played" type="recent" />
			<AlbumSection title="Most Played" type="frequent" />
			<AlbumSection title="Favorites" type="starred" />
			<AlbumSection title="Quick Picks" type="random" />
			<GenreSection />
		</div>
	);
}
