import { createFileRoute } from "@tanstack/react-router";

import { ChatPane } from "@/components/chat/ChatPane";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/channel/$channelId/$messageId")({
	component: ChannelMessageScreen,
});

function ChannelMessageScreen() {
	const { channelId, messageId } = Route.useParams();
	const gate = useSignedInGate();
	return (
		<ChatPane
			channelId={channelId}
			highlightMessageId={messageId}
			screenId="channel-message"
			loading={gate.status === "loading"}
		/>
	);
}
