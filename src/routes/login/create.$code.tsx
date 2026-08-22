import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/create/$code")({
	component: RegisterInviteScreen,
});

function RegisterInviteScreen() {
	const session = useAtomValue(sessionAtom);
	const { code } = Route.useParams();
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-register-invite">
			<RegisterForm inviteCode={code} title="Create account with invite" />
		</AuthShell>
	);
}
