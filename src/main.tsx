import { QueryClient } from "@tanstack/solid-query";
import { PersistQueryClientProvider } from "@tanstack/solid-query-persist-client";
import {
	createHashHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { createIDBPersister } from "./lib/persistence";
import { routeTree } from "./routeTree.gen";
import "@fontsource-variable/geist";
import "./styles.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
});

const persister = createIDBPersister();

// Use hash history for Electron compatibility (file:// protocol)
const hashHistory = createHashHistory();

// Set up a Router instance
const router = createRouter({
	routeTree,
	history: hashHistory,
	defaultPreload: "intent",
	scrollRestoration: false,
	defaultViewTransition: true,
	defaultPreloadStaleTime: 0,
	context: {
		queryClient,
	},
});
declare module "@tanstack/solid-router" {
	interface Register {
		// This infers the type of our router and registers it across your entire project
		router: typeof router;
	}
}
const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
	render(
		() => (
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{
					persister,
					maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
				}}
			>
				<RouterProvider router={router} />
			</PersistQueryClientProvider>
		),
		rootElement,
	);
}
