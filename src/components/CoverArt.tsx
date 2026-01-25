import { IconMusic } from "@tabler/icons-solidjs";
import { type Component, createEffect, createSignal, Show } from "solid-js";
import { getCoverArtUrl } from "~/lib/api";
import { cn } from "~/lib/utils";

interface CoverArtProps {
	id?: string;
	size?: number;
	class?: string;
}

const CoverArt: Component<CoverArtProps> = (props) => {
	const [url, setUrl] = createSignal<string>();
	const [isLoaded, setIsLoaded] = createSignal(false);
	const [isLoading, setIsLoading] = createSignal(false);

	createEffect(() => {
		const id = props.id;
		const size = props.size;

		if (!id) {
			setUrl(undefined);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setIsLoaded(false);
		setUrl(undefined); // Force re-mount of img element to ensure onload fires consistently

		getCoverArtUrl(id, size).then((fetchedUrl) => {
			setUrl(fetchedUrl);
		});
	});

	return (
		<div
			class={cn(
				"relative overflow-hidden bg-muted w-full flex items-center justify-center",
				props.class,
			)}
		>
			{/* Fallback Icon / Pulse state */}
			<Show when={isLoading() && !isLoaded()}>
				<div class="absolute inset-0 flex items-center justify-center text-muted-foreground animate-pulse z-10">
					<IconMusic class="size-1/3 opacity-50" />
				</div>
			</Show>

			<Show
				when={url()}
				fallback={
					<div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
						<IconMusic class="size-1/3" />
					</div>
				}
			>
				<img
					src={url()}
					alt=""
					class={cn(
						"h-full w-full object-cover transition-opacity duration-300",
						isLoaded() ? "opacity-100" : "opacity-0",
					)}
					loading="eager"
					onload={() => {
						setIsLoaded(true);
						setIsLoading(false);
					}}
					onerror={() => {
						setIsLoaded(false);
						setIsLoading(false);
						setUrl(undefined); // Trigger fallback
					}}
				/>
			</Show>
		</div>
	);
};

export default CoverArt;
