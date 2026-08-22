import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyCard } from "@/components/auth/VerifyCard";

export const Route = createFileRoute("/login/verify/$token")({
	component: VerifyScreen,
});

function VerifyScreen() {
	const { token } = Route.useParams();
	return (
		<AuthShell testId="screen-verify">
			<VerifyCard token={token} />
		</AuthShell>
	);
}
