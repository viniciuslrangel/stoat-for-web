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
import { useAuthFeatures } from "@/hooks/useAuthFeatures";
import { useRegister } from "@/hooks/useRegister";
import { cn } from "@/lib/utils";

export function RegisterForm({
	inviteCode,
	title,
}: {
	inviteCode?: string;
	title: string;
}) {
	const navigate = useNavigate();
	const { data: features } = useAuthFeatures();
	const { status, register, submitUsername, cancelOnboarding } = useRegister();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [invite, setInvite] = useState(inviteCode ?? "");
	const [username, setUsername] = useState("");

	const submitting = status.kind === "submitting";
	const onboarding =
		status.kind === "onboarding" || status.kind === "onboarding-submitting";
	const onboardingSubmitting = status.kind === "onboarding-submitting";
	const showInvite = features?.inviteOnly !== false || Boolean(inviteCode);
	const inviteRequired = features?.inviteOnly === true || Boolean(inviteCode);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (onboarding) {
			if (await submitUsername(username)) {
				await navigate({ to: "/app" });
			}
			return;
		}
		const result = await register({
			email,
			password,
			invite: invite.trim() || undefined,
		});
		if (result?.kind === "logged-in") {
			await navigate({ to: "/app" });
			return;
		}
		if (result?.kind === "check-email") {
			await navigate({ to: "/login/check", replace: true });
			return;
		}
		if (result?.kind === "need-login") {
			await navigate({ to: "/login/auth", replace: true });
		}
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">
					{onboarding ? "Choose a username" : title}
				</h1>
				<CardDescription>
					{onboarding
						? "Pick a username that people can find you by."
						: showInvite
							? "Enter your email, a password, and an invite code."
							: "Enter your email and a new password."}
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
								<Label htmlFor="new-password">Password</Label>
								<Input
									id="new-password"
									name="new-password"
									type="password"
									autoComplete="new-password"
									minLength={8}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
									disabled={submitting}
								/>
							</div>
							{showInvite ? (
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="invite">Invite code</Label>
									<Input
										id="invite"
										name="invite"
										autoComplete="off"
										value={invite}
										onChange={(event) => setInvite(event.target.value)}
										required={inviteRequired}
										disabled={submitting}
									/>
								</div>
							) : null}
						</>
					)}
					{status.kind === "error" ? (
						<p className="text-sm text-destructive" role="alert">
							{status.message}
						</p>
					) : null}
					{status.kind === "onboarding" && status.error ? (
						<p className="text-sm text-destructive" role="alert">
							{status.error}
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
								{onboarding ? "Saving username" : "Creating account"}
							</>
						) : onboarding ? (
							"Continue"
						) : (
							"Register"
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
							to="/login/auth"
							className={cn(
								buttonVariants({ variant: "link", size: "sm" }),
								"h-auto px-0",
							)}
						>
							Already have an account? Log in
						</Link>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
