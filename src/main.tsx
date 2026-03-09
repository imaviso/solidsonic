import { QueryClientProvider } from "@tanstack/solid-query";
import {
	createBrowserHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { initDynamicThemeWatcher } from "./lib/dynamic-theme";
import { initRemoteHostSync } from "./lib/player";
import { createAppQueryClient } from "./lib/query";
import "~/lib/settings"; // Initialize settings (theme, etc.)
import { routeTree } from "./routeTree.gen";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "./styles.css";

const queryClient = createAppQueryClient();

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
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		),
		rootElement,
	);
}
