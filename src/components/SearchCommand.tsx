import {
	IconDisc,
	IconLoader2,
	IconMusic,
	IconSearch,
	IconUser,
} from "@tabler/icons-solidjs";
import { useNavigate } from "@tanstack/solid-router";
import {
	For,
	Show,
	createResource,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import { search, type SearchResult } from "~/lib/api";
import { usePlayer } from "~/lib/player";

export function SearchCommand() {
	const [open, setOpen] = createSignal(false);
	const [query, setQuery] = createSignal("");
	const navigate = useNavigate();
	const player = usePlayer();

	// Search resource with query
	const [results] = createResource(query, async (q) => {
		if (q.length < 2) return null;
		try {
			// Small delay to debounce server requests
			await new Promise((resolve) => setTimeout(resolve, 300));
			// Re-check query after delay
			if (q !== query()) return null;

			return await search(q);
		} catch (e) {
			console.error("Search failed:", e);
			return null;
		}
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

			<CommandDialog open={open()} onOpenChange={setOpen}>
				<CommandInput
					placeholder="Search for songs, albums, artists..."
					value={query()}
					onValueChange={setQuery}
				/>
				<CommandList>
					<Show when={results.loading}>
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="size-6 animate-spin text-muted-foreground" />
						</div>
					</Show>

					<Show
						when={
							!results.loading &&
							query().length >= 2 &&
							(!results() ||
								(results()?.artists.length === 0 &&
									results()?.albums.length === 0 &&
									results()?.songs.length === 0))
						}
					>
						<CommandEmpty>No results found.</CommandEmpty>
					</Show>

					<Show when={results()}>
						{(res) => {
							const data = res as unknown as SearchResult;
							return (
								<>
									<Show when={data.artists.length > 0}>
										<CommandGroup heading="Artists">
											<For each={data.artists}>
												{(artist) => (
													<CommandItem
														onSelect={() => {
															navigate({
																to: "/app/artists/$id",
																params: { id: artist.id },
															});
															setOpen(false);
														}}
													>
														<IconUser class="mr-2 size-4" />
														<span>{artist.name}</span>
													</CommandItem>
												)}
											</For>
										</CommandGroup>
									</Show>

									<Show when={data.albums.length > 0}>
										<CommandGroup heading="Albums">
											<For each={data.albums}>
												{(album) => (
													<CommandItem
														onSelect={() => {
															navigate({
																to: "/app/albums/$id",
																params: { id: album.id },
															});
															setOpen(false);
														}}
													>
														<IconDisc class="mr-2 size-4" />
														<div class="flex flex-col">
															<span>{album.name}</span>
															<span class="text-xs text-muted-foreground">
																{album.artist}
															</span>
														</div>
													</CommandItem>
												)}
											</For>
										</CommandGroup>
									</Show>

									<Show when={data.songs.length > 0}>
										<CommandGroup heading="Songs">
											<For each={data.songs}>
												{(song) => (
													<CommandItem
														onSelect={() => {
															player.playSong(song, data.songs);
															setOpen(false);
														}}
													>
														<IconMusic class="mr-2 size-4" />
														<div class="flex flex-col">
															<span>{song.title}</span>
															<span class="text-xs text-muted-foreground">
																{song.artist} • {song.album}
															</span>
														</div>
													</CommandItem>
												)}
											</For>
										</CommandGroup>
									</Show>
								</>
							);
						}}
					</Show>
				</CommandList>
			</CommandDialog>
		</>
	);
}
