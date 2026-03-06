import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TabsPrimitive from "@kobalte/core/tabs";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const Tabs = TabsPrimitive.Root;

type TabsListProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsListProps<T> & {
		class?: string | undefined;
	};

const TabsList = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, TabsListProps<T>>,
) => {
	const [local, others] = splitProps(props as TabsListProps, ["class"]);
	return (
		<TabsPrimitive.List
			class={cn(
				"inline-flex h-12 items-center justify-center rounded-full bg-muted/50 p-1 text-muted-foreground",
				local.class,
			)}
			{...others}
		/>
	);
};

type TabsTriggerProps<T extends ValidComponent = "button"> =
	TabsPrimitive.TabsTriggerProps<T> & {
		class?: string | undefined;
	};

const TabsTrigger = <T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TabsTriggerProps<T>>,
) => {
	const [local, others] = splitProps(props as TabsTriggerProps, ["class"]);
	return (
		<TabsPrimitive.Trigger
			class={cn(
				"inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-primary data-[selected]:shadow-[0_1px_3px_0_rgba(0,0,0,0.1),_0_1px_2px_-1px_rgba(0,0,0,0.1)]",
				local.class,
			)}
			{...others}
		/>
	);
};

type TabsContentProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsContentProps<T> & {
		class?: string | undefined;
	};

const TabsContent = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, TabsContentProps<T>>,
) => {
	const [local, others] = splitProps(props as TabsContentProps, ["class"]);
	return (
		<TabsPrimitive.Content
			class={cn(
				"mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				local.class,
			)}
			{...others}
		/>
	);
};

type TabsIndicatorProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsIndicatorProps<T> & {
		class?: string | undefined;
	};

const TabsIndicator = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, TabsIndicatorProps<T>>,
) => {
	const [local, others] = splitProps(props as TabsIndicatorProps, ["class"]);
	return (
		<TabsPrimitive.Indicator
			class={cn(
				"duration-250ms absolute transition data-[orientation=horizontal]:-bottom-px data-[orientation=vertical]:-right-px data-[orientation=horizontal]:h-[2px] data-[orientation=vertical]:w-[2px]",
				local.class,
			)}
			{...others}
		/>
	);
};

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator };
