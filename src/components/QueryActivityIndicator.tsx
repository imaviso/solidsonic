import { useIsFetching, useIsMutating } from "@tanstack/solid-query";
import { Show } from "solid-js";

export function QueryActivityIndicator() {
	const isFetching = useIsFetching();
	const isMutating = useIsMutating();

	return (
		<Show when={isFetching() + isMutating() > 0}>
			<div class="inline-flex items-center gap-2 rounded-none border border-border bg-background/80 backdrop-blur-md px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
				<span class="size-1.5 animate-pulse rounded-none bg-primary" />
				Syncing
			</div>
		</Show>
	);
}
