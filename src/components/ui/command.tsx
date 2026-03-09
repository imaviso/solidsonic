import type { Component, ComponentProps, ParentProps, VoidProps } from "solid-js";
import { splitProps } from "solid-js";

import type { DialogRootProps } from "@kobalte/core/dialog";
import * as CommandPrimitive from "cmdk-solid";

import { cn } from "~/lib/utils";
import { Dialog, DialogContent } from "~/components/ui/dialog";

const Command: Component<ParentProps<CommandPrimitive.CommandRootProps>> = (props) => {
  const [local, others] = splitProps(props, ["class", "shouldFilter"]);

  return (
		<CommandPrimitive.CommandRoot
			shouldFilter={local.shouldFilter ?? true}
			class={cn(
				"panel-surface flex size-full flex-col overflow-hidden rounded-none bg-popover text-popover-foreground blur-none",
				local.class,
			)}
			{...others}
		/>
	);
};

const CommandDialog: Component<ParentProps<DialogRootProps & { shouldFilter?: boolean }>> = (props) => {
  const [local, others] = splitProps(props, ["children", "shouldFilter"]);

  return (
		<Dialog {...others}>
			<DialogContent class="max-w-3xl overflow-hidden border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden">
				<Command
					shouldFilter={local.shouldFilter}
					class="border border-border shadow-[12px_12px_0_0_hsl(var(--border)/0.45)] [&_[cmdk-group-heading]]:panel-heading [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-16 [&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-4 [&_[cmdk-item]_svg]:size-5"
				>
					{local.children}
				</Command>
			</DialogContent>
		</Dialog>
	);
};

const CommandInput: Component<VoidProps<CommandPrimitive.CommandInputProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<div class="shell-divider flex items-center border-b border-border px-4 py-1" cmdk-input-wrapper="">
			<svg
				xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
				class="mr-3 size-4 shrink-0 opacity-60"
			>
        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
        <path d="M21 21l-6 -6" />
      </svg>
			<CommandPrimitive.CommandInput
				class={cn(
					"flex h-14 w-full rounded-none bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
					local.class,
				)}
				{...others}
			/>
		</div>
  );
};

const CommandList: Component<ParentProps<CommandPrimitive.CommandListProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<CommandPrimitive.CommandList
			class={cn("max-h-[min(70vh,42rem)] overflow-y-auto overflow-x-hidden", local.class)}
			{...others}
		/>
	);
};

const CommandEmpty: Component<ParentProps<CommandPrimitive.CommandEmptyProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<CommandPrimitive.CommandEmpty
			class={cn("py-10 text-center text-sm text-muted-foreground", local.class)}
			{...others}
		/>
	);
};

const CommandGroup: Component<ParentProps<CommandPrimitive.CommandGroupProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<CommandPrimitive.CommandGroup
			class={cn(
				"overflow-hidden p-2 text-foreground [&_[cmdk-group-heading]]:text-muted-foreground",
				local.class,
			)}
			{...others}
		/>
	);
};

const CommandSeparator: Component<VoidProps<CommandPrimitive.CommandSeparatorProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return <CommandPrimitive.CommandSeparator class={cn("h-px bg-border", local.class)} {...others} />;
};

const CommandItem: Component<ParentProps<CommandPrimitive.CommandItemProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<CommandPrimitive.CommandItem
			cmdk-item=""
			class={cn(
				"relative flex cursor-default select-none items-center rounded-none border-b border-border/50 px-4 py-3 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 last:border-b-0",
				local.class,
			)}
			{...others}
		/>
	);
};

const CommandShortcut: Component<ComponentProps<"span">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
		<span
			class={cn("mono-meta ml-auto text-muted-foreground", local.class)}
			{...others}
		/>
	);
};

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
