import { createFileRoute } from "@tanstack/react-router";

import { ChatPane } from "@/components/chat/ChatPane";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/channel/$channelId/")({
	component: ChannelScreen,
});

function ChannelScreen() {
	const { channelId } = Route.useParams();
	const gate = useSignedInGate();
	return (
		<ChatPane
			channelId={channelId}
			screenId="channel"
			loading={gate.status === "loading"}
		/>
	);
}
