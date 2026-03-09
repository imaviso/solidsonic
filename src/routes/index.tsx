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
		<div class="min-h-screen bg-background p-4 md:p-6">
			<div class="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden border border-border bg-background md:grid-cols-[minmax(0,1.05fr)_minmax(360px,480px)] md:p-0">
				<div class="panel-surface hidden border-r border-border bg-main-content p-8 md:flex md:flex-col md:justify-between lg:p-12">
					<div>
						<div class="panel-heading mb-4">SolidSonic Interface</div>
						<h1 class="page-title max-w-xl text-foreground">
							Operate your music server like a control system.
						</h1>
						<p class="mt-6 max-w-lg text-base text-muted-foreground lg:text-lg">
							Borrowing from terminal dashboards and repository control rooms,
							this player keeps discovery, playback, and library management in
							one structured workspace.
						</p>
					</div>
					<div class="grid gap-px border border-border bg-border sm:grid-cols-3">
						<div class="metric-panel bg-background px-4 py-4">
							<div class="panel-heading">Server Auth</div>
							<div class="mt-2 text-lg font-semibold tracking-[-0.04em]">
								Auto-detect
							</div>
						</div>
						<div class="metric-panel bg-background px-4 py-4">
							<div class="panel-heading">Modes</div>
							<div class="mt-2 text-lg font-semibold tracking-[-0.04em]">
								API / Legacy
							</div>
						</div>
						<div class="metric-panel bg-background px-4 py-4">
							<div class="panel-heading">Protocol</div>
							<div class="mt-2 text-lg font-semibold tracking-[-0.04em]">
								Subsonic
							</div>
						</div>
					</div>
				</div>

				<div class="flex items-center justify-center p-4 sm:p-8 md:p-10">
					<div class="w-full max-w-md">
						<div class="mb-8 md:hidden">
							<div class="mb-4 inline-flex size-14 items-center justify-center border border-border bg-muted">
								<IconMusic class="size-7 text-foreground" />
							</div>
							<h1 class="page-title text-foreground">SOLIDSONIC.</h1>
							<p class="mt-2 text-muted-foreground">
								Connect to your music server
							</p>
						</div>

						<Card class="shadow-[10px_10px_0_0_hsl(var(--border)/0.45)]">
							<CardHeader class="pb-4">
								<div class="panel-heading mb-3">01 Server Login</div>
								<CardTitle class="section-title tracking-[-0.04em]">
									Connect
								</CardTitle>
								<CardDescription class="text-base">
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
													field().state.meta.errors.length > 0
														? "invalid"
														: "valid"
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
										<div class="p-3 rounded-none bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
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

						<p class="mt-6 text-center text-sm text-muted-foreground">
							Compatible with Subsonic, Navidrome, Airsonic, and other Subsonic
							API servers
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
