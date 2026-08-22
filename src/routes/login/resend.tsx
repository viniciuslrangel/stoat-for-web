import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResendForm } from "@/components/auth/ResendForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/resend")({
	component: ResendScreen,
});

function ResendScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-resend">
			<ResendForm />
		</AuthShell>
	);
}
