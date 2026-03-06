import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const Input: Component<ComponentProps<"input">> = (props) => {
	const [local, others] = splitProps(props, ["class", "type"]);
	return (
		<input
			type={local.type}
			class={cn(
				"flex h-12 w-full rounded-t-xl border-b-2 border-b-input bg-muted/50 px-4 py-2 text-base transition-[border-color,background-color] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-b-primary focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
				local.class,
			)}
			{...others}
		/>
	);
};

export { Input };
