import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/create/")({
	component: RegisterScreen,
});

function RegisterScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-register">
			<RegisterForm title="Create account" />
		</AuthShell>
	);
}
