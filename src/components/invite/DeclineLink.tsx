import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Decline CTA shared by invite and add-bot cards. */
export function DeclineLink({ signedIn }: { signedIn: boolean }) {
	if (signedIn) {
		return (
			<Link
				to="/app"
				className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
			>
				Decline
			</Link>
		);
	}
	return (
		<Link
			to="/login"
			className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
		>
			Decline
		</Link>
	);
}
