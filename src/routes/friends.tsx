import { createFileRoute, Navigate } from "@tanstack/react-router";

import { FriendsPage } from "@/components/friends/FriendsPage";
import { AppShell } from "@/components/shell/AppShell";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/friends")({
	component: FriendsScreen,
});

function FriendsScreen() {
	const gate = useSignedInGate();
	if (gate.status === "anonymous") {
		return <Navigate to="/login" replace />;
	}
	const loading = gate.status === "loading";
	return (
		<AppShell loading={loading} title="Friends">
			<FriendsPage loading={loading} />
		</AppShell>
	);
}
