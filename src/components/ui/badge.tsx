import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
				secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				outline: "text-foreground",
				success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
				warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
				error: "border-transparent bg-error text-error-foreground hover:bg-error/80",
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
