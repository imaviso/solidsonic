import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const calloutVariants = cva("rounded-none p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)]", {
	variants: {
		variant: {
			default:
				"bg-muted/50 text-foreground",
			success:
				"bg-success/20 text-success-foreground",
			warning:
				"bg-warning/20 text-warning-foreground",
			error:
				"bg-error/20 text-error-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

type CalloutProps = ComponentProps<"div"> &
	VariantProps<typeof calloutVariants>;

const Callout: Component<CalloutProps> = (props) => {
	const [local, others] = splitProps(props, ["class", "variant"]);
	return (
		<div
			class={cn(calloutVariants({ variant: local.variant }), local.class)}
			{...others}
		/>
	);
};

const CalloutTitle: Component<ComponentProps<"h3">> = (props) => {
	const [local, others] = splitProps(props, ["class"]);
	return <h3 class={cn("font-semibold", local.class)} {...others} />;
};

const CalloutContent: Component<ComponentProps<"div">> = (props) => {
	const [local, others] = splitProps(props, ["class"]);
	return <div class={cn("mt-2", local.class)} {...others} />;
};

export { Callout, CalloutTitle, CalloutContent };
