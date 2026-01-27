import {
	IconDisc,
	IconLoader2,
	IconMusic,
	IconSearch,
	IconUser,
} from "@tabler/icons-solidjs";
import { useNavigate } from "@tanstack/solid-router";
import {
	createEffect,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import CoverArt from "~/components/CoverArt";
import { Button } from "~/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "~/components/ui/command";
import { type SearchResult, type Song, search } from "~/lib/api";
import { usePlayer } from "~/lib/player";

type RecentSearchItem = {
	type: "artist" | "album" | "song";
	id: string;
	title: string;
	subtitle?: string;
	coverArt?: string;
	timestamp: number;
	// Store extra data needed for navigation/playback
	data?: Song;
};

const RECENT_SEARCHES_KEY = "solidsonic_recent_searches";

function getRecentSearches(): RecentSearchItem[] {
	try {
		const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
		return saved ? JSON.parse(saved) : [];
	} catch {
		return [];
	}
}

function addRecentSearch(item: Omit<RecentSearchItem, "timestamp">) {
	const current = getRecentSearches();
	// Remove duplicates (by id and type)
	const filtered = current.filter(
		(i) => !(i.id === item.id && i.type === item.type),
	);
	// Add new item to top
	const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(
		0,
		10,
	);
	localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
	return updated;
}

function clearRecentSearches() {
	localStorage.removeItem(RECENT_SEARCHES_KEY);
	return [];
}

export function SearchCommand() {
	const [open, setOpen] = createSignal(false);
	const [query, setQuery] = createSignal("");
	const [results, setResults] = createSignal<SearchResult | null>(null);
	const [loading, setLoading] = createSignal(false);
	const [recentSearches, setRecentSearches] = createSignal<RecentSearchItem[]>(
		[],
	);
	const navigate = useNavigate();
	const player = usePlayer();

	onMount(() => {
		setRecentSearches(getRecentSearches());
	});

	// Search effect with debounce
	createEffect(() => {
		const q = query();
		if (q.length < 2) {
			setResults(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const timer = setTimeout(async () => {
			try {
				const res = await search(q);
				setResults(res);
			} catch (e) {
				console.error("Search failed:", e);
				setResults(null);
			} finally {
				setLoading(false);
			}
		}, 300);

		onCleanup(() => clearTimeout(timer));
	});

	onMount(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		onCleanup(() => document.removeEventListener("keydown", down));
	});

	const handleSelect = (
		type: "artist" | "album" | "song",
		id: string,
		title: string,
		subtitle?: string,
		coverArt?: string,
		data?: Song,
	) => {
		const updated = addRecentSearch({
			type,
			id,
			title,
			subtitle,
			coverArt,
			data,
		});
		setRecentSearches(updated);
		setOpen(false);

		// Navigation / Action logic
		if (type === "artist") {
			navigate({ to: "/app/artists/$id", params: { id } });
		} else if (type === "album") {
			navigate({ to: "/app/albums/$id", params: { id } });
		} else if (type === "song" && data) {
			// For songs, we play them
			// Ideally we would play from the search context, but just playing the single song is okay for now
			// or we can pass the search result list if available
			player.playSong(data, results()?.songs ?? [data]);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				class="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-md hover:bg-muted transition-colors w-40 md:w-64 text-left group"
			>
				<IconSearch class="size-4 group-hover:text-foreground transition-colors" />
				<span class="group-hover:text-foreground transition-colors">
					Search library...
				</span>
				<kbd class="ml-auto pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
					<span class="text-xs">⌘</span>K
				</kbd>
			</button>

			<CommandDialog open={open()} onOpenChange={setOpen} shouldFilter={false}>
				<CommandInput
					placeholder="Search for songs, albums, artists..."
					value={query()}
					onValueChange={setQuery}
				/>
				<CommandList>
					<Show when={loading()}>
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="size-6 animate-spin text-muted-foreground" />
						</div>
					</Show>

					{/* Recent Searches */}
					<Show when={!query() && recentSearches().length > 0}>
						<CommandGroup
							heading={
								<div class="flex items-center justify-between">
									<span>Recent</span>
									<Button
										variant="ghost"
										size="sm"
										class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
										onClick={(e) => {
											e.stopPropagation();
											setRecentSearches(clearRecentSearches());
										}}
									>
										Clear
									</Button>
								</div>
							}
						>
							<For each={recentSearches()}>
								{(item) => (
									<CommandItem
										onSelect={() =>
											handleSelect(
												item.type,
												item.id,
												item.title,
												item.subtitle,
												item.coverArt,
												item.data,
											)
										}
										class="group"
									>
										<div class="mr-2 flex items-center justify-center size-8 rounded-md bg-muted/50 text-muted-foreground">
											<Show when={item.type === "artist"}>
												<IconUser class="size-4" />
											</Show>
											<Show when={item.type === "album"}>
												<IconDisc class="size-4" />
											</Show>
											<Show when={item.type === "song"}>
												<IconMusic class="size-4" />
											</Show>
										</div>
										<div class="flex flex-col flex-1 min-w-0">
											<span class="truncate font-medium">{item.title}</span>
											<Show when={item.subtitle}>
												<span class="text-xs text-muted-foreground truncate">
													{item.subtitle}
												</span>
											</Show>
										</div>
										<div class="text-xs text-muted-foreground capitalize opacity-50">
											{item.type}
										</div>
									</CommandItem>
								)}
							</For>
						</CommandGroup>
						<CommandSeparator />
					</Show>

					<Show
						when={
							!loading() &&
							query().length >= 2 &&
							(!results() ||
								((results()?.artists?.length ?? 0) === 0 &&
									(results()?.albums?.length ?? 0) === 0 &&
									(results()?.songs?.length ?? 0) === 0))
						}
					>
						<CommandEmpty>No results found.</CommandEmpty>
					</Show>

					<Show when={!loading() && results()}>
						<Show when={(results()?.artists?.length ?? 0) > 0}>
							<CommandGroup heading="Artists">
								<For each={results()?.artists}>
									{(artist) => (
										<CommandItem
											onSelect={() =>
												handleSelect(
													"artist",
													artist.id,
													artist.name,
													undefined,
													artist.coverArt,
												)
											}
										>
											<CoverArt
												id={artist.coverArt}
												class="mr-3 size-10 rounded-full object-cover"
											/>
											<span class="font-medium">{artist.name}</span>
										</CommandItem>
									)}
								</For>
							</CommandGroup>
						</Show>

						<Show when={(results()?.albums?.length ?? 0) > 0}>
							<CommandGroup heading="Albums">
								<For each={results()?.albums}>
									{(album) => (
										<CommandItem
											onSelect={() =>
												handleSelect(
													"album",
													album.id,
													album.name,
													album.artist,
													album.coverArt,
												)
											}
										>
											<CoverArt
												id={album.coverArt}
												class="mr-3 size-10 rounded-md object-cover shadow-sm"
											/>
											<div class="flex flex-col">
												<span class="font-medium">{album.name}</span>
												<span class="text-xs text-muted-foreground">
													{album.artist}
												</span>
											</div>
										</CommandItem>
									)}
								</For>
							</CommandGroup>
						</Show>

						<Show when={(results()?.songs?.length ?? 0) > 0}>
							<CommandGroup heading="Songs">
								<For each={results()?.songs}>
									{(song) => (
										<CommandItem
											onSelect={() =>
												handleSelect(
													"song",
													song.id,
													song.title,
													`${song.artist} • ${song.album}`,
													song.coverArt,
													song,
												)
											}
										>
											<CoverArt
												id={song.coverArt}
												class="mr-3 size-10 rounded-md object-cover shadow-sm"
											/>
											<div class="flex flex-col">
												<span class="font-medium">{song.title}</span>
												<span class="text-xs text-muted-foreground">
													{song.artist} • {song.album}
												</span>
											</div>
										</CommandItem>
									)}
								</For>
							</CommandGroup>
						</Show>
					</Show>
				</CommandList>
			</CommandDialog>
		</>
	);
}
