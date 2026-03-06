import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToggleButtonPrimitive from "@kobalte/core/toggle-button";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const toggleVariants = cva(
	"inline-flex items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border-2 border-input bg-transparent hover:bg-accent",
			},
			size: {
				default: "h-10 px-4",
				sm: "h-9 px-3",
				lg: "h-11 px-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ToggleButtonRootProps<T extends ValidComponent = "button"> =
	ToggleButtonPrimitive.ToggleButtonRootProps<T> &
		VariantProps<typeof toggleVariants> & { class?: string | undefined };

const Toggle = <T extends ValidComponent = "button">(
	props: PolymorphicProps<T, ToggleButtonRootProps<T>>,
) => {
	const [local, others] = splitProps(props as ToggleButtonRootProps, [
		"class",
		"variant",
		"size",
	]);
	return (
		<ToggleButtonPrimitive.Root
			class={cn(
				toggleVariants({ variant: local.variant, size: local.size }),
				local.class,
			)}
			{...others}
		/>
	);
};

export type { ToggleButtonRootProps as ToggleProps };
export { toggleVariants, Toggle };
