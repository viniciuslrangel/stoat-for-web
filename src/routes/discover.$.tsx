import { createFileRoute, Navigate } from "@tanstack/react-router";

import { DiscoverUnavailable } from "@/components/discover/DiscoverUnavailable";
import { AppShell } from "@/components/shell/AppShell";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/discover/$")({
	component: DiscoverScreen,
});

function DiscoverScreen() {
	const gate = useSignedInGate();
	if (gate.status === "anonymous") {
		return <Navigate to="/login" replace />;
	}
	const loading = gate.status === "loading";
	return (
		<AppShell loading={loading} title="Discover">
			<DiscoverUnavailable loading={loading} />
		</AppShell>
	);
}
