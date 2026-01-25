import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig({
	base: "./",
	plugins: [tanstackRouter({ target: "solid", autoCodeSplitting: true }), solid()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
});
