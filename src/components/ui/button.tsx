import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border border-transparent font-mono text-[0.72rem] font-medium uppercase tracking-[0.16em] ring-offset-background transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.14)] hover:-translate-y-px hover:bg-primary/92 hover:shadow-[0_0_0_1px_hsl(var(--primary)),3px_3px_0_0_hsl(var(--border))] active:translate-y-0 active:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.14)]",
				destructive:
					"border-destructive bg-destructive text-destructive-foreground hover:-translate-y-px hover:bg-destructive/92 hover:shadow-[0_0_0_1px_hsl(var(--destructive)),3px_3px_0_0_hsl(var(--border))] active:translate-y-0",
				outline:
					"border-border bg-transparent text-foreground hover:-translate-y-px hover:border-foreground hover:bg-accent/70 hover:shadow-[3px_3px_0_0_hsl(var(--border))] active:translate-y-0 active:shadow-none",
				secondary:
					"border-border bg-secondary/70 text-secondary-foreground hover:-translate-y-px hover:bg-secondary hover:shadow-[3px_3px_0_0_hsl(var(--border))] active:translate-y-0 active:shadow-none",
				ghost:
					"text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground active:bg-accent",
				link: "border-transparent p-0 font-mono text-[0.72rem] text-primary underline-offset-4 hover:text-foreground hover:underline",
			},
			size: {
				default: "h-11 px-5 py-2",
				sm: "h-9 px-3 text-[0.68rem]",
				lg: "h-12 px-7 text-[0.74rem]",
				icon: "size-10 p-0",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);
type ButtonProps<T extends ValidComponent = "button"> =
	ButtonPrimitive.ButtonRootProps<T> &
	VariantProps<typeof buttonVariants> & {
		class?: string | undefined;
		children?: JSX.Element;
	};

const Button = <T extends ValidComponent = "button">(
	props: PolymorphicProps<T, ButtonProps<T>>,
) => {
	const [local, others] = splitProps(props as ButtonProps, [
		"variant",
		"size",
		"class",
	]);
	return (
		<ButtonPrimitive.Root
			class={cn(
				buttonVariants({ variant: local.variant, size: local.size }),
				local.class,
			)}
			{...others}
		/>
	);
};

export { Button, buttonVariants };
export type { ButtonProps };
