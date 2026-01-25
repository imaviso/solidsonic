import { createEffect, onCleanup } from "solid-js";

export function useIntersectionObserver(
	target: () => Element | undefined | null,
	callback: IntersectionObserverCallback,
	options?: IntersectionObserverInit,
) {
	createEffect(() => {
		const el = target();
		if (!el) return;

		const observer = new IntersectionObserver(callback, options);
		observer.observe(el);

		onCleanup(() => {
			observer.disconnect();
		});
	});
}
