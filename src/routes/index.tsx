import {
	IconLoader2,
	IconLock,
	IconMusic,
	IconServer,
	IconUser,
} from "@tabler/icons-solidjs";
import { createForm } from "@tanstack/solid-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
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
import { ping } from "~/lib/subsonic";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (isAuthenticated()) {
			throw redirect({ to: "/app" });
		}
	},
	component: LoginPage,
});

const loginSchema = v.object({
	serverUrl: v.pipe(
		v.string(),
		v.nonEmpty("Server URL is required"),
		v.url("Please enter a valid URL"),
	),
	username: v.pipe(v.string(), v.nonEmpty("Username is required")),
	password: v.pipe(v.string(), v.nonEmpty("Password is required")),
});

function LoginPage() {
	const navigate = useNavigate();
	const [serverError, setServerError] = createSignal<string | null>(null);

	const form = createForm(() => ({
		defaultValues: {
			serverUrl: "",
			username: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setServerError(null);

			// Validate manually if needed, or rely on form validation
			// TanStack Form usually handles validation if validators are passed

			// Valibot validation
			const result = v.safeParse(loginSchema, value);
			if (!result.success) {
				// Form should handle this via validators prop usually, but we can do it here too
				// For now, assume simple validation passed or we'll rely on field level validation
				return;
			}

			const credentials = {
				serverUrl: value.serverUrl.trim(),
				username: value.username.trim(),
				password: value.password,
			};

			const pingResult = await ping(credentials);

			if (pingResult.success) {
				authLogin(credentials);
				navigate({ to: "/app" });
			} else {
				setServerError(pingResult.error || "Failed to connect to server");
			}
		},
		// Field validators can be passed here or on Field
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
										onBlur={field().handleBlur}
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
											{field().state.meta.errors.join(", ")}
										</TextFieldErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Username */}
							<form.Field
								name="username"
								validators={{
									onChange: v.pipe(
										v.string(),
										v.nonEmpty("Username is required"),
									),
								}}
							>
								{(field) => (
									<TextField
										name={field().name}
										value={field().state.value}
										onChange={(value) => field().handleChange(value)}
										onBlur={field().handleBlur}
										validationState={
											field().state.meta.errors.length > 0 ? "invalid" : "valid"
										}
									>
										<TextFieldLabel for={field().name}>Username</TextFieldLabel>
										<div class="relative">
											<IconUser class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
											<TextFieldInput
												type="text"
												placeholder="Enter your username"
												class="pl-10"
											/>
										</div>
										<TextFieldErrorMessage>
											{field().state.meta.errors.join(", ")}
										</TextFieldErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Password */}
							<form.Field
								name="password"
								validators={{
									onChange: v.pipe(
										v.string(),
										v.nonEmpty("Password is required"),
									),
								}}
							>
								{(field) => (
									<TextField
										name={field().name}
										value={field().state.value}
										onChange={(value) => field().handleChange(value)}
										onBlur={field().handleBlur}
										validationState={
											field().state.meta.errors.length > 0 ? "invalid" : "valid"
										}
									>
										<TextFieldLabel for={field().name}>Password</TextFieldLabel>
										<div class="relative">
											<IconLock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
											<TextFieldInput
												type="password"
												placeholder="Enter your password"
												class="pl-10"
											/>
										</div>
										<TextFieldErrorMessage>
											{field().state.meta.errors.join(", ")}
										</TextFieldErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Server Error Message */}
							<Show when={serverError()}>
								<div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
									{serverError()}
								</div>
							</Show>

							{/* Submit Button */}
							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<Button
										type="submit"
										class="w-full"
										disabled={isSubmitting()}
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
