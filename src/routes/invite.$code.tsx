import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/auth/AuthShell";
import { InviteJoinCard } from "@/components/invite/InviteJoinCard";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/invite/$code")({
	component: InviteScreen,
});

function InviteScreen() {
	const { code } = Route.useParams();
	useSignedInGate();
	return (
		<AuthShell testId="screen-invite">
			<InviteJoinCard code={code} />
		</AuthShell>
	);
}
