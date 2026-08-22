import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";
import { HomeDashboard } from "@/components/shell/HomeDashboard";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/app")({
	component: HomeScreen,
});

function HomeScreen() {
	const gate = useSignedInGate();
	if (gate.status === "anonymous") {
		return <Navigate to="/login" replace />;
	}
	const loading = gate.status === "loading";
	return (
		<AppShell loading={loading} title="Home">
			<HomeDashboard loading={loading} />
		</AppShell>
	);
}
