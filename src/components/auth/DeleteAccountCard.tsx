import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { cn } from "@/lib/utils";

export function DeleteAccountCard({ token }: { token: string }) {
	const status = useDeleteAccount(token);

	let description = "Please wait…";
	if (status.kind === "success") {
		description = "Account has been queued for deletion.";
	} else if (status.kind === "error") {
		description =
			"Something went wrong. Email support if this keeps happening.";
	}

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">Delete account</h1>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{status.kind === "pending" ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Confirming the delete link
					</p>
				) : null}
				{status.kind === "error" ? (
					<p className="text-sm text-destructive" role="alert">
						{status.message}
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
