import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-solidjs";
import type { Component } from "solid-js";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTheme } from "~/lib/theme";
import { cn } from "~/lib/utils";

interface ModeToggleProps {
	triggerClass?: string;
}

const ModeToggle: Component<ModeToggleProps> = (props) => {
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				as={Button<"button">}
				variant="ghost"
				size="icon"
				class={cn("size-8 px-0", props.triggerClass)}
			>
				<IconSun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
				<IconMoon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => setTheme("light")}>
					<IconSun class="mr-2 h-4 w-4" />
					<span>Light</span>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					<IconMoon class="mr-2 h-4 w-4" />
					<span>Dark</span>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					<IconDeviceDesktop class="mr-2 h-4 w-4" />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ModeToggle;
