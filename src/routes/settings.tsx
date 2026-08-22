import { createFileRoute, Navigate } from "@tanstack/react-router";

import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { useMeSnapshot } from "@/hooks/useMeSnapshot";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/settings")({
	component: SettingsScreen,
});

function SettingsScreen() {
	const gate = useSignedInGate();
	const me = useMeSnapshot();

	if (gate.status === "anonymous") {
		return <Navigate to="/login/auth" replace />;
	}

	return <SettingsOverlay loading={gate.status === "loading"} me={me} />;
}
