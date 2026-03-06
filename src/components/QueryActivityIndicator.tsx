import { useIsFetching, useIsMutating } from "@tanstack/solid-query";
import { Show } from "solid-js";

export function QueryActivityIndicator() {
	const isFetching = useIsFetching();
	const isMutating = useIsMutating();

	return (
		<Show when={isFetching() + isMutating() > 0}>
			<div class="inline-flex items-center gap-2 rounded-full border-none shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)] bg-background/80 backdrop-blur-md px-3 py-1 text-xs font-medium text-muted-foreground">
				<span class="size-1.5 animate-pulse rounded-full bg-primary" />
				Syncing
			</div>
		</Show>
	);
}
