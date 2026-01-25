import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import CoverArt from "~/components/CoverArt";
import { getArtists } from "~/lib/api";

export const Route = createFileRoute("/app/artists/")({
	component: ArtistsPage,
});

const ITEM_HEIGHT = 220;
const IMAGE_HEIGHT = 160;
const TEXT_HEIGHT = 60;

function ArtistsPage() {
	let scrollContainerRef!: HTMLDivElement;
	const [columns, setColumns] = createSignal(5);

	const artists = useQuery(() => ({
		queryKey: ["artists"],
		queryFn: getArtists,
	}));

	const allArtists = createMemo(() => artists.data ?? []);
	const rowCount = createMemo(() => Math.ceil(allArtists().length / columns()));

	// Track container size for responsive columns
	createEffect(() => {
		if (!scrollContainerRef) return;

		const updateColumns = () => {
			const width = scrollContainerRef.clientWidth;
			if (width < 400) setColumns(2);
			else if (width < 600) setColumns(3);
			else if (width < 800) setColumns(4);
			else if (width < 1000) setColumns(5);
			else setColumns(6);
		};
		updateColumns();

		const resizeObserver = new ResizeObserver(updateColumns);
		resizeObserver.observe(scrollContainerRef);

		onCleanup(() => resizeObserver.disconnect());
	});

	const virtualizer = createVirtualizer({
		get count() {
			return rowCount();
		},
		getScrollElement: () => scrollContainerRef,
		estimateSize: () => ITEM_HEIGHT,
		overscan: 3,
	});

	return (
		<div class="flex flex-col gap-4 h-full">
			<div>
				<h2 class="text-3xl font-bold tracking-tight">Artists</h2>
				<p class="text-muted-foreground">Your artist library</p>
			</div>

			<Show when={artists.isLoading}>
				<div class="py-10 text-center">Loading...</div>
			</Show>

			<div
				ref={scrollContainerRef}
				class="flex-1 overflow-y-auto min-h-0"
				onScroll={() => {}} // Virtualizer handles scroll reading
			>
				<Show when={!artists.isLoading && allArtists().length > 0}>
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						<For each={virtualizer.getVirtualItems()}>
							{(virtualRow) => {
								const startIndex = () => virtualRow.index * columns();
								const rowArtists = () =>
									allArtists().slice(startIndex(), startIndex() + columns());

								return (
									<div
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										<div
											class="grid gap-4"
											style={{
												"grid-template-columns": `repeat(${columns()}, minmax(0, 1fr))`,
											}}
										>
											<For each={rowArtists()}>
												{(artist) => (
													<Link
														to="/app/artists/$id"
														params={{ id: artist.id }}
														class="block group"
													>
														<div class="flex flex-col items-center text-center">
															<div
																style={{
																	height: `${IMAGE_HEIGHT}px`,
																	width: `${IMAGE_HEIGHT}px`,
																}}
															>
																<CoverArt
																	id={artist.coverArt}
																	class="h-full w-full object-cover rounded-full shadow-sm"
																/>
															</div>
															<div
																class="pt-2 w-full"
																style={{ height: `${TEXT_HEIGHT}px` }}
															>
																<h3 class="font-medium text-sm truncate group-hover:underline">
																	{artist.name}
																</h3>
																<p class="text-xs text-muted-foreground truncate">
																	{artist.albumCount} albums
																</p>
															</div>
														</div>
													</Link>
												)}
											</For>
										</div>
									</div>
								);
							}}
						</For>
					</div>
				</Show>
			</div>
		</div>
	);
}
