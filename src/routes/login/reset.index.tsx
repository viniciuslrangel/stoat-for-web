import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/reset/")({
	component: ResetScreen,
});

function ResetScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-reset">
			<ResetForm />
		</AuthShell>
	);
}
