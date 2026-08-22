import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/auth")({
	component: LoginScreen,
});

function LoginScreen() {
	const session = useAtomValue(sessionAtom);
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-login">
			<LoginForm />
		</AuthShell>
	);
}
