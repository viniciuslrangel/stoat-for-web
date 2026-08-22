import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useLogin";
import { cn } from "@/lib/utils";

export function LoginForm() {
	const navigate = useNavigate();
	const { status, login, submitMfa, submitUsername, cancelOnboarding } =
		useLogin();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [mfaCode, setMfaCode] = useState("");
	const [username, setUsername] = useState("");

	const submitting = status.kind === "submitting";
	const mfa = status.kind === "mfa";
	const onboarding =
		status.kind === "onboarding" || status.kind === "onboarding-submitting";
	const onboardingSubmitting = status.kind === "onboarding-submitting";
	const error =
		status.kind === "error"
			? status.message
			: status.kind === "mfa"
				? status.error
				: status.kind === "onboarding"
					? status.error
					: undefined;

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (onboarding) {
			if (await submitUsername(username)) {
				await navigate({ to: "/app" });
			}
			return;
		}
		const result = mfa
			? await submitMfa(mfaCode)
			: await login(email, password);
		if (result?.kind === "success") {
			await navigate({ to: "/app" });
		}
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">
					{onboarding ? "Choose a username" : "Log in"}
				</h1>
				<CardDescription>
					{onboarding
						? "Pick a username that people can find you by."
						: mfa
							? "Enter the code from your authenticator app."
							: "Welcome back. Enter your email and password."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => void onSubmit(event)}
				>
					{onboarding ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								name="username"
								autoComplete="username"
								minLength={2}
								value={username}
								onChange={(event) => setUsername(event.target.value)}
								required
								disabled={onboardingSubmitting}
							/>
						</div>
					) : mfa ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="mfa-code">Authentication code</Label>
							<Input
								id="mfa-code"
								name="mfa-code"
								inputMode="numeric"
								autoComplete="one-time-code"
								value={mfaCode}
								onChange={(event) => setMfaCode(event.target.value)}
								required
								disabled={submitting}
							/>
						</div>
					) : (
						<>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
									disabled={submitting}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									name="password"
									type="password"
									autoComplete="current-password"
									minLength={8}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
									disabled={submitting}
								/>
							</div>
						</>
					)}
					{error ? (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					) : null}
					<Button
						type="submit"
						className="w-full"
						disabled={submitting || onboardingSubmitting}
					>
						{submitting || onboardingSubmitting ? (
							<>
								<Loader2 className="animate-spin" />
								{onboarding ? "Saving username" : "Logging in"}
							</>
						) : onboarding ? (
							"Continue"
						) : (
							"Log in"
						)}
					</Button>
					{onboarding ? (
						<Button
							type="button"
							variant="ghost"
							disabled={onboardingSubmitting}
							onClick={cancelOnboarding}
						>
							Cancel
						</Button>
					) : null}
					<div className="flex flex-col gap-1 text-sm">
						<Link
							to="/login/reset"
							className={cn(
								buttonVariants({ variant: "link", size: "sm" }),
								"h-auto px-0",
							)}
						>
							Forgot your password?
						</Link>
						<Link
							to="/login/resend"
							className={cn(
								buttonVariants({ variant: "link", size: "sm" }),
								"h-auto px-0",
							)}
						>
							Resend verification
						</Link>
					</div>
					<div className="flex items-center justify-between text-sm">
						<Link
							to="/login"
							className={cn(
								buttonVariants({ variant: "ghost", size: "sm" }),
								"px-0",
							)}
						>
							Back
						</Link>
						<Link
							to="/login/create"
							className={cn(
								buttonVariants({ variant: "link", size: "sm" }),
								"h-auto px-0",
							)}
						>
							Need an account? Register
						</Link>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
