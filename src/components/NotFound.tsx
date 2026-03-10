import { IconArrowLeft, IconGhost } from "@tabler/icons-solidjs";
import { Link } from "@tanstack/solid-router";
import { Button } from "~/components/ui/button";

export function NotFound() {
	return (
		<div class="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background">
			{/* Background Ambience */}
			<div class="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.16)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.16)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

			{/* Content */}
			<div class="panel-surface relative z-10 flex max-w-xl flex-col items-center space-y-6 border border-border px-6 py-8 text-center animate-in fade-in zoom-in duration-500 sm:px-8">
				{/* Icon/Visual */}
				<div class="relative">
					<IconGhost
						class="relative z-10 h-20 w-20 text-primary/80"
						stroke-width={1}
					/>
				</div>

				{/* Typography */}
				<div class="space-y-3">
					<div class="panel-heading">Missing Route</div>
					<h1 class="text-3xl font-thin tracking-tight text-foreground select-none sm:text-4xl">
						404
					</h1>
					<h2 class="text-xl font-medium tracking-wide text-foreground/80">
						Page not found
					</h2>
					<p class="state-copy">
						The page you are looking for does not exist or has been moved.
						Please check the URL or navigate back home.
					</p>
				</div>

				{/* Actions */}
				<div class="flex items-center gap-4">
					<Link to="/">
						<Button variant="outline" class="group">
							<IconArrowLeft class="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
							Back to Home
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
