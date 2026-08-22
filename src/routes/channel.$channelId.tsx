import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";
import { useChannelSnapshot } from "@/hooks/useChannelSnapshot";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/channel/$channelId")({
	component: ChannelChannelIdLayout,
});

function ChannelChannelIdLayout() {
	const gate = useSignedInGate();
	const { channelId } = Route.useParams();
	const channel = useChannelSnapshot(channelId);

	if (gate.status === "anonymous") {
		return <Navigate to="/login" replace />;
	}

	return (
		<AppShell
			loading={gate.status === "loading"}
			title={channel?.name ?? "Channel"}
		>
			<Outlet />
		</AppShell>
	);
}
