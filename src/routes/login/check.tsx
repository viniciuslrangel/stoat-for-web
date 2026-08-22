import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { CheckEmailCard } from "@/components/auth/CheckEmailCard";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/check")({
	component: CheckEmailScreen,
});

function CheckEmailScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-check-email">
			<CheckEmailCard />
		</AuthShell>
	);
}
