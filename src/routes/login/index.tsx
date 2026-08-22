import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { WelcomeCard } from "@/components/auth/WelcomeCard";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/")({
	component: WelcomeScreen,
});

function WelcomeScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-welcome">
			<WelcomeCard />
		</AuthShell>
	);
}
