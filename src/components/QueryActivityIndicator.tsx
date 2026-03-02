import { useIsFetching, useIsMutating } from "@tanstack/solid-query";
import { Show } from "solid-js";

export function QueryActivityIndicator() {
	const isFetching = useIsFetching();
	const isMutating = useIsMutating();

	return (
		<Show when={isFetching() + isMutating() > 0}>
			<div class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
				<span class="size-1.5 animate-pulse rounded-full bg-primary" />
				Syncing
			</div>
		</Show>
	);
}
