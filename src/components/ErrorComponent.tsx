import { IconAlertTriangle, IconRefresh } from "@tabler/icons-solidjs";
import { useRouter } from "@tanstack/solid-router";
import { Button } from "~/components/ui/button";

interface ErrorComponentProps {
	error: Error;
	reset: () => void;
}

export function ErrorComponent(props: ErrorComponentProps) {
	const router = useRouter();

	return (
		<div class="relative flex min-h-[400px] h-full w-full flex-col items-center justify-center overflow-hidden bg-background">
			{/* Background Ambience */}
			<div class="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.16)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.16)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

			{/* Content */}
			<div class="panel-surface relative z-10 flex max-w-2xl flex-col items-center space-y-6 border border-border px-6 py-8 text-center animate-in fade-in zoom-in duration-500 sm:px-8">
				{/* Icon/Visual */}
				<div class="relative">
					<IconAlertTriangle
						class="relative z-10 h-20 w-20 text-destructive/80"
						stroke-width={1}
					/>
				</div>

				{/* Typography */}
				<div class="space-y-3">
					<div class="panel-heading">System Error</div>
					<h1 class="text-3xl font-thin tracking-tight text-foreground select-none">
						Something went wrong
					</h1>
					<p class="mx-auto max-w-[500px] border border-destructive/20 bg-background p-4 text-sm leading-relaxed text-muted-foreground break-all">
						{props.error.message}
					</p>
					<p class="state-copy">
						Try the request again. If the problem keeps happening, reload the
						page or return to the previous view.
					</p>
				</div>

				{/* Actions */}
				<div class="flex items-center gap-4">
					<Button
						variant="outline"
						class="group"
						onClick={() => {
							props.reset();
							router.invalidate();
						}}
					>
						<IconRefresh class="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
						Try Again
					</Button>
				</div>
			</div>
		</div>
	);
}
