import type { QueryClient } from "@tanstack/solid-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { Suspense } from "solid-js";
import { ensureAuthLoaded } from "~/lib/auth";
import { ErrorComponent } from "../components/ErrorComponent";
import { NotFound } from "../components/NotFound";
import { Toaster } from "../components/ui/sonner";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		await ensureAuthLoaded();
	},
	component: RootComponent,
	errorComponent: ErrorComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<>
			<Suspense fallback={null}>
				<Outlet />
			</Suspense>
			<Toaster />
		</>
	);
}
