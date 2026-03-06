import {
	IconKey,
	IconLoader2,
	IconLock,
	IconMusic,
	IconServer,
	IconUser,
} from "@tabler/icons-solidjs";
import { createForm } from "@tanstack/solid-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/solid-router";
import { batch, createSignal, Show } from "solid-js";
import * as v from "valibot";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	TextField,
	TextFieldErrorMessage,
	TextFieldInput,
	TextFieldLabel,
} from "~/components/ui/text-field";

import { login as authLogin, isAuthenticated } from "~/lib/auth";
import {
	getTokenInfoWithApiKey,
	ping,
	supportsApiKeyAuthentication,
} from "~/lib/subsonic";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (isAuthenticated()) {
			throw redirect({ to: "/app" });
		}
	},
	component: LoginPage,
});

const serverUrlSchema = v.pipe(
	v.string(),
	v.nonEmpty("Server URL is required"),
	v.url("Please enter a valid URL"),
);

type DetectedAuthMode = "unknown" | "apiKey" | "legacy";

function formatFieldErrors(errors: unknown[]): string {
	return errors
		.map((error) => {
			if (typeof error === "string") return error;
			if (
				error &&
				typeof error === "object" &&
				"message" in error &&
				typeof (error as { message?: unknown }).message === "string"
			) {
				return (error as { message: string }).message;
			}
			return "Invalid value";
		})
		.join(", ");
}

function LoginPage() {
	const navigate = useNavigate();
	const [serverError, setServerError] = createSignal<string | null>(null);
	const [authMode, setAuthMode] = createSignal<DetectedAuthMode>("unknown");
	const [isDetectingAuthMode, setIsDetectingAuthMode] = createSignal(false);
	const [lastDetectedServerUrl, setLastDetectedServerUrl] = createSignal("");

	const detectServerAuthMode = async (
		serverUrl: string,
		force = false,
	): Promise<DetectedAuthMode> => {
		if (
			!force &&
			lastDetectedServerUrl() === serverUrl &&
			authMode() !== "unknown"
		) {
			return authMode();
		}

		setIsDetectingAuthMode(true);
		try {
			const supportsApiKey = await supportsApiKeyAuthentication(serverUrl);
			const nextMode: DetectedAuthMode = supportsApiKey ? "apiKey" : "legacy";
			setAuthMode(nextMode);
			setLastDetectedServerUrl(serverUrl);
			return nextMode;
		} finally {
			setIsDetectingAuthMode(false);
		}
	};

	const form = createForm(() => ({
		defaultValues: {
			serverUrl: "",
			apiKey: "",
			username: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setServerError(null);

			const trimmedServerUrl = value.serverUrl.trim();
			const serverUrlResult = v.safeParse(serverUrlSchema, trimmedServerUrl);
			if (!serverUrlResult.success) {
				const firstIssue = serverUrlResult.issues[0];
				setServerError(firstIssue?.message || "Server URL is required");
				return;
			}

			const detectedMode = await detectServerAuthMode(trimmedServerUrl, true);

			if (detectedMode === "apiKey") {
				const trimmedApiKey = value.apiKey.trim();
				if (!trimmedApiKey) {
					setServerError(
						"This server supports OpenSubsonic API keys. Enter an API key to continue.",
					);
					return;
				}

				try {
					const tokenInfo = await getTokenInfoWithApiKey(
						trimmedServerUrl,
						trimmedApiKey,
					);

					batch(() => {
						authLogin({
							authType: "apiKey",
							serverUrl: trimmedServerUrl,
							apiKey: trimmedApiKey,
							username: tokenInfo.username,
						});
						navigate({ to: "/app" });
					});
				} catch (error) {
					setServerError(
						error instanceof Error ? error.message : "Invalid API key",
					);
				}
				return;
			}

			const trimmedUsername = value.username.trim();
			if (!trimmedUsername) {
				setServerError("Username is required");
				return;
			}
			if (!value.password) {
				setServerError("Password is required");
				return;
			}

			const pingResult = await ping({
				authType: "legacy",
				serverUrl: trimmedServerUrl,
				username: trimmedUsername,
				password: value.password,
			});

			if (!pingResult.success) {
				setServerError(pingResult.error || "Failed to connect to server");
				return;
			}

			batch(() => {
				authLogin({
					authType: "legacy",
					serverUrl: trimmedServerUrl,
					username: trimmedUsername,
					password: value.password,
				});
				navigate({ to: "/app" });
			});
		},
	}));

	return (
		<div class="min-h-screen flex items-center justify-center bg-background p-4">
			<div class="w-full max-w-md">
				{/* Logo/Header */}
				<div class="text-center mb-8">
					<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
						<IconMusic class="w-8 h-8 text-foreground" />
					</div>
					<h1 class="text-3xl font-bold text-foreground mb-2">SolidSonic</h1>
					<p class="text-muted-foreground">Connect to your music server</p>
				</div>

				{/* Login Card */}
				<Card>
					<CardHeader>
						<CardTitle>Sign In</CardTitle>
						<CardDescription>
							Enter your Subsonic server credentials
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							class="space-y-4"
						>
							{/* Server URL */}
							<form.Field
								name="serverUrl"
								validators={{
									onChange: v.pipe(
										v.string(),
										v.nonEmpty("Server URL is required"),
										v.url("Please enter a valid URL"),
									),
								}}
							>
								{(field) => (
									<TextField
										name={field().name}
										value={field().state.value}
										onChange={(value) => field().handleChange(value)}
										onBlur={() => {
											field().handleBlur();
											const trimmedServerUrl = field().state.value.trim();
											const result = v.safeParse(
												serverUrlSchema,
												trimmedServerUrl,
											);
											if (result.success) {
												setServerError(null);
												void detectServerAuthMode(trimmedServerUrl);
											} else {
												setAuthMode("unknown");
												setLastDetectedServerUrl("");
											}
										}}
										validationState={
											field().state.meta.errors.length > 0 ? "invalid" : "valid"
										}
									>
										<TextFieldLabel for={field().name}>
											Server URL
										</TextFieldLabel>
										<div class="relative">
											<IconServer class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
											<TextFieldInput
												type="url"
												placeholder="https://your-server.com"
												class="pl-10"
											/>
										</div>
										<TextFieldErrorMessage>
											{formatFieldErrors(field().state.meta.errors)}
										</TextFieldErrorMessage>
										<Show when={field().state.meta.errors.length === 0}>
											<Show
												when={isDetectingAuthMode()}
												fallback={
													<Show when={authMode() !== "unknown"}>
														<p class="text-xs text-muted-foreground mt-1">
															{authMode() === "apiKey"
																? "OpenSubsonic API key authentication detected"
																: "Legacy username/password authentication"}
														</p>
													</Show>
												}
											>
												<p class="text-xs text-muted-foreground mt-1">
													Checking server authentication capabilities...
												</p>
											</Show>
										</Show>
									</TextField>
								)}
							</form.Field>

							<Show when={authMode() === "apiKey"}>
								<form.Field name="apiKey">
									{(field) => (
										<TextField
											name={field().name}
											value={field().state.value}
											onChange={(value) => field().handleChange(value)}
											onBlur={field().handleBlur}
										>
											<TextFieldLabel for={field().name}>
												API Key
											</TextFieldLabel>
											<div class="relative">
												<IconKey class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
												<TextFieldInput
													type="password"
													placeholder="Paste your OpenSubsonic API key"
													class="pl-10"
												/>
											</div>
										</TextField>
									)}
								</form.Field>
							</Show>

							<Show when={authMode() !== "apiKey"}>
								<form.Field name="username">
									{(field) => (
										<TextField
											name={field().name}
											value={field().state.value}
											onChange={(value) => field().handleChange(value)}
											onBlur={field().handleBlur}
										>
											<TextFieldLabel for={field().name}>
												Username
											</TextFieldLabel>
											<div class="relative">
												<IconUser class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
												<TextFieldInput
													type="text"
													placeholder="Enter your username"
													class="pl-10"
												/>
											</div>
										</TextField>
									)}
								</form.Field>

								<form.Field name="password">
									{(field) => (
										<TextField
											name={field().name}
											value={field().state.value}
											onChange={(value) => field().handleChange(value)}
											onBlur={field().handleBlur}
										>
											<TextFieldLabel for={field().name}>
												Password
											</TextFieldLabel>
											<div class="relative">
												<IconLock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
												<TextFieldInput
													type="password"
													placeholder="Enter your password"
													class="pl-10"
												/>
											</div>
										</TextField>
									)}
								</form.Field>
							</Show>

							{/* Server Error Message */}
							<Show when={serverError()}>
								<div class="p-3 rounded-2xl bg-destructive/10 border-none text-destructive text-sm">
									{serverError()}
								</div>
							</Show>

							{/* Submit Button */}
							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<Button
										type="submit"
										class="w-full"
										disabled={isSubmitting() || isDetectingAuthMode()}
									>
										<Show when={isSubmitting()} fallback="Connect">
											<IconLoader2 class="w-4 h-4 animate-spin mr-2" />
											Connecting...
										</Show>
									</Button>
								)}
							</form.Subscribe>
						</form>
					</CardContent>
				</Card>

				{/* Footer */}
				<p class="text-center text-muted-foreground text-sm mt-6">
					Compatible with Subsonic, Navidrome, Airsonic, and other Subsonic API
					servers
				</p>
			</div>
		</div>
	);
}
