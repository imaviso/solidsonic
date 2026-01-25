import type { QueryClient } from "@tanstack/solid-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { ensureAuthLoaded } from "~/lib/auth";
import { Toaster } from "../components/ui/sonner";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		await ensureAuthLoaded();
	},
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<Outlet />
			<Toaster />
		</>
	);
}
