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
import { useResendVerification } from "@/hooks/useResendVerification";
import { cn } from "@/lib/utils";

export function ResendForm() {
	const navigate = useNavigate();
	const { status, resend } = useResendVerification();
	const [email, setEmail] = useState("");
	const submitting = status.kind === "submitting";

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = await resend(email);
		if (result === "check-email") {
			await navigate({ to: "/login/check", replace: true });
		}
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">
					Resend verification
				</h1>
				<CardDescription>
					Enter your email and we will send a new verification message.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => void onSubmit(event)}
				>
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
					{status.kind === "error" ? (
						<p className="text-sm text-destructive" role="alert">
							{status.message}
						</p>
					) : null}
					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting ? (
							<>
								<Loader2 className="animate-spin" />
								Sending
							</>
						) : (
							"Resend"
						)}
					</Button>
					<Link
						to="/login/auth"
						className={cn(
							buttonVariants({ variant: "ghost", size: "sm" }),
							"h-auto px-0",
						)}
					>
						Go back to login
					</Link>
				</form>
			</CardContent>
		</Card>
	);
}
