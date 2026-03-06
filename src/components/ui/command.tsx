import type { Component, ComponentProps, ParentProps, VoidProps } from "solid-js"
import { splitProps } from "solid-js"

import type { DialogRootProps } from "@kobalte/core/dialog"
import * as CommandPrimitive from "cmdk-solid"

import { cn } from "~/lib/utils"
import { Dialog, DialogContent } from "~/components/ui/dialog"

const Command: Component<ParentProps<CommandPrimitive.CommandRootProps>> = (props) => {
  const [local, others] = splitProps(props, ["class", "shouldFilter"])

  return (
    <CommandPrimitive.CommandRoot
      shouldFilter={local.shouldFilter ?? true}
      class={cn(
        "flex size-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground blur-none",
        local.class
      )}
      {...others}
    />
  )
}

const CommandDialog: Component<ParentProps<DialogRootProps & { shouldFilter?: boolean }>> = (props) => {
  const [local, others] = splitProps(props, ["children", "shouldFilter"])

  return (
    <Dialog {...others}>
      <DialogContent class="overflow-hidden p-0 bg-transparent shadow-none border-none sm:rounded-xl [&>button]:hidden">
        <Command shouldFilter={local.shouldFilter} class="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5 shadow-[0_8px_10px_-5px_rgba(0,0,0,0.2),_0_16px_24px_2px_rgba(0,0,0,0.14),_0_6px_30px_5px_rgba(0,0,0,0.12)]">
          {local.children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput: Component<VoidProps<CommandPrimitive.CommandInputProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="mr-2 size-4 shrink-0 opacity-50"
      >
        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
        <path d="M21 21l-6 -6" />
      </svg>
      <CommandPrimitive.CommandInput
        class={cn(
          "flex h-12 w-full rounded-xl bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          local.class
        )}
        {...others}
      />
    </div>
  )
}

const CommandList: Component<ParentProps<CommandPrimitive.CommandListProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <CommandPrimitive.CommandList
      class={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", local.class)}
      {...others}
    />
  )
}

const CommandEmpty: Component<ParentProps<CommandPrimitive.CommandEmptyProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <CommandPrimitive.CommandEmpty
      class={cn("py-6 text-center text-sm", local.class)}
      {...others}
    />
  )
}

const CommandGroup: Component<ParentProps<CommandPrimitive.CommandGroupProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <CommandPrimitive.CommandGroup
      class={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        local.class
      )}
      {...others}
    />
  )
}

const CommandSeparator: Component<VoidProps<CommandPrimitive.CommandSeparatorProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return <CommandPrimitive.CommandSeparator class={cn("h-px bg-border", local.class)} {...others} />
}

const CommandItem: Component<ParentProps<CommandPrimitive.CommandItemProps>> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <CommandPrimitive.CommandItem
      cmdk-item=""
      class={cn(
        "relative flex cursor-default select-none items-center rounded-full px-4 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        local.class
      )}
      {...others}
    />
  )
}

const CommandShortcut: Component<ComponentProps<"span">> = (props) => {
  const [local, others] = splitProps(props, ["class"])

  return (
    <span
      class={cn("ml-auto text-xs tracking-widest text-muted-foreground", local.class)}
      {...others}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
}
