import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WelcomeCard() {
	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader>
				<h1 className="text-2xl font-bold tracking-tight">Stoat</h1>
				<p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
					Welcome
				</p>
				<CardDescription>
					Log in with your Stoat account or create one with an invite.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<Link to="/login/auth" className={cn(buttonVariants(), "w-full")}>
					Log in
				</Link>
				<Link
					to="/login/create"
					className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
				>
					Sign up
				</Link>
			</CardContent>
		</Card>
	);
}
