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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/useResetPassword";
import { cn } from "@/lib/utils";

export function ResetConfirmForm({ token }: { token: string }) {
	const navigate = useNavigate();
	const { status, confirmReset } = useResetPassword();
	const [password, setPassword] = useState("");
	const [removeSessions, setRemoveSessions] = useState(false);
	const submitting = status.kind === "submitting";

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = await confirmReset({
			token,
			password,
			removeSessions,
		});
		if (result === "done") {
			await navigate({ to: "/login/auth", replace: true });
		}
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
				<CardDescription>
					Choose a new password for your account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => void onSubmit(event)}
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="new-password">New password</Label>
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
					<div className="flex items-center gap-2">
						<Checkbox
							id="log-out"
							checked={removeSessions}
							onCheckedChange={(checked) => setRemoveSessions(checked === true)}
							disabled={submitting}
						/>
						<Label htmlFor="log-out">Log out of other sessions</Label>
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
								Saving
							</>
						) : (
							"Reset"
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
