import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/** Class for secondary action tiles on Home / Discover landings. */
export const landingActionClassName = cn(
	buttonVariants({ variant: "secondary" }),
	"h-auto justify-start gap-3 px-4 py-3 text-left whitespace-normal",
);

/**
 * Shared Discord-like destination page chrome used by Home and Discover
 * (header + centered hero + action grid). Keep product copy in callers.
 */
export function DestinationLanding({
	testId,
	header,
	loading,
	title,
	description,
	actions,
}: {
	testId: string;
	header: ReactNode;
	loading: boolean;
	title: string;
	description: string;
	actions: ReactNode;
}) {
	const isPhone = useMediaQuery("(max-width: 767px)");

	return (
		<main
			data-testid={testId}
			className="flex min-h-0 min-w-0 flex-1 flex-col app-canvas text-foreground"
		>
			{isPhone ? null : (
				<header className="flex h-12 shrink-0 items-center gap-2 border-b-[3px] border-border px-4 text-base font-bold tracking-tight">
					{header}
				</header>
			)}
			{loading ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
					<Skeleton className="h-8 w-40 rounded-md border-[3px] border-border bg-muted" />
					<Skeleton className="h-24 w-full max-w-xl rounded-md border-[3px] border-border bg-muted" />
				</div>
			) : (
				<div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-auto p-8">
					<div className="max-w-lg text-center">
						<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
						<p className="mt-2 text-sm text-muted-foreground">{description}</p>
					</div>
					<div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
						{actions}
					</div>
				</div>
			)}
		</main>
	);
}

/** Icon + title + blurb body for a landing action tile. */
export function LandingActionBody({
	icon,
	title,
	description,
}: {
	icon: ReactNode;
	title: string;
	description: string;
}) {
	return (
		<>
			{icon}
			<span>
				<span className="block font-semibold">{title}</span>
				<span className="block text-xs font-normal text-muted-foreground">
					{description}
				</span>
			</span>
		</>
	);
}
