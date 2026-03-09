import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-none px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
				secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				outline: "text-foreground",
				success: "border-transparent bg-success/20 text-success hover:bg-success/30",
				warning: "border-transparent bg-warning/20 text-warning hover:bg-warning/30",
				error: "border-transparent bg-error/20 text-error hover:bg-error/30",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = ComponentProps<"div"> &
	VariantProps<typeof badgeVariants>;

const Badge: Component<BadgeProps> = (props) => {
	const [local, others] = splitProps(props, ["class", "variant"]);
	return (
		<div
			class={cn(
				badgeVariants({ variant: local.variant }),
				local.class,
			)}
			{...others}
		/>
	);
};

export type { BadgeProps };
export { Badge, badgeVariants };
