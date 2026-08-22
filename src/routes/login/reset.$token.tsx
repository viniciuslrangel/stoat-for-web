import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetConfirmForm } from "@/components/auth/ResetConfirmForm";
import { isSignedIn, sessionAtom } from "@/domain/session";

export const Route = createFileRoute("/login/reset/$token")({
	component: ResetConfirmScreen,
});

function ResetConfirmScreen() {
	const session = useAtomValue(sessionAtom);
	const { token } = Route.useParams();
	if (isSignedIn(session)) {
		return <Navigate to="/app" />;
	}
	return (
		<AuthShell testId="screen-reset-confirm">
			<ResetConfirmForm token={token} />
		</AuthShell>
	);
}
