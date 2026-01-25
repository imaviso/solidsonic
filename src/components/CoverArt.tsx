import { IconMusic } from "@tabler/icons-solidjs";
import { type Component, createResource, createSignal, Show } from "solid-js";
import { getCoverArtUrl } from "~/lib/api";
import { cn } from "~/lib/utils";

interface CoverArtProps {
	id?: string;
	size?: number;
	class?: string;
}

const CoverArt: Component<CoverArtProps> = (props) => {
	const [url] = createResource(
		() => props.id,
		(id) => getCoverArtUrl(id, props.size),
	);
	const [isLoaded, setIsLoaded] = createSignal(false);

	return (
		<div
			class={cn(
				"relative overflow-hidden bg-muted w-full flex items-center justify-center",
				props.class,
			)}
		>
			{/* Fallback Icon (always rendered behind or when loading) */}
			<Show when={!isLoaded()}>
				<div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
					<IconMusic class="size-1/3" />
				</div>
			</Show>

			{/* Image */}
			<Show when={url()}>
				<img
					src={url()}
					alt="" /* Empty alt prevents text display while loading */
					class={cn(
						"h-full w-full object-cover transition-opacity duration-300",
						isLoaded() ? "opacity-100" : "opacity-0",
					)}
					loading="lazy"
					onload={() => setIsLoaded(true)}
					onerror={() => setIsLoaded(false)}
				/>
			</Show>
		</div>
	);
};

export default CoverArt;
