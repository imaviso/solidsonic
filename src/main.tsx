import { PersistQueryClientProvider } from "@tanstack/solid-query-persist-client";
import {
	createBrowserHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { initDynamicThemeWatcher } from "./lib/dynamic-theme";
import { createIDBPersister } from "./lib/persistence";
import { initRemoteHostSync } from "./lib/player";
import { createAppQueryClient } from "./lib/query";
import "~/lib/settings"; // Initialize settings (theme, etc.)
import { routeTree } from "./routeTree.gen";
import "@fontsource-variable/google-sans/index.css";
import "@fontsource-variable/google-sans-code/index.css";
import "./styles.css";

const queryClient = createAppQueryClient();

const persister = createIDBPersister();

const browserHistory = createBrowserHistory();

initRemoteHostSync();
initDynamicThemeWatcher();

// Set up a Router instance
const router = createRouter({
	routeTree,
	history: browserHistory,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultViewTransition: false,
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
