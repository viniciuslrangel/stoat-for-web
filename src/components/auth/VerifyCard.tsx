import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { useVerifyEmail } from "@/hooks/useVerifyEmail";
import { cn } from "@/lib/utils";

export function VerifyCard({ token }: { token: string }) {
	const navigate = useNavigate();
	const { status, continueStatus, continueToApp } = useVerifyEmail(token);
	const submitting = continueStatus.kind === "submitting";

	async function onContinue() {
		const result = await continueToApp();
		if (result === "logged-in") {
			await navigate({ to: "/app" });
			return;
		}
		if (result === "need-login") {
			await navigate({ to: "/login/auth", replace: true });
		}
	}

	let description = "Confirming this email link with the server.";
	if (status.kind === "success") {
		description = status.mfaTicket
			? "Your email is verified. Continue to finish signing in."
			: "Your email is verified. You can log in now.";
	} else if (status.kind === "error") {
		description = status.message;
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">Verify email</h1>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{status.kind === "pending" ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Verifying your account
					</p>
				) : null}
				{status.kind === "success" && status.mfaTicket ? (
					<Button
						className="w-full"
						disabled={submitting}
						onClick={() => void onContinue()}
					>
						{submitting ? (
							<>
								<Loader2 className="animate-spin" />
								Continuing
							</>
						) : (
							"Continue to app"
						)}
					</Button>
				) : null}
				{status.kind === "success" && !status.mfaTicket ? (
					<Link to="/login/auth" className={cn(buttonVariants(), "w-full")}>
						Log in
					</Link>
				) : null}
				{continueStatus.kind === "error" ? (
					<p className="text-sm text-destructive" role="alert">
						{continueStatus.message}
					</p>
				) : null}
				<Link
					to="/login/auth"
					className={cn(
						buttonVariants({ variant: "ghost", size: "sm" }),
						"h-auto px-0",
					)}
				>
					Go back to login
				</Link>
			</CardContent>
		</Card>
	);
}
