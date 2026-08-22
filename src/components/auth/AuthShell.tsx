import type { ReactNode } from "react";

export function AuthShell({
	testId,
	children,
}: {
	testId: string;
	children: ReactNode;
}) {
	return (
		<main
			data-testid={testId}
			className="dark auth-canvas flex min-h-svh items-center justify-center p-4 text-foreground"
		>
			{children}
		</main>
	);
}
