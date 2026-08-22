import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { mailProviderFor } from "@/lib/mail-provider";
import { cn } from "@/lib/utils";

export function CheckEmailCard() {
	const email = useAtomValue(pendingCheckEmailAtom);
	const provider = mailProviderFor(email);

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
				<CardDescription>
					We sent a message if this server has email enabled. Allow a few
					minutes for it to arrive.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{provider ? (
					<a
						href={provider.href}
						target="_blank"
						rel="noreferrer"
						className={cn(buttonVariants(), "w-full")}
					>
						Open {provider.label}
					</a>
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
