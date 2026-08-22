import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultTextChannelId } from "@/hooks/chat-snapshots";
import { useServerChannels } from "@/hooks/useServerChannels";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/server/$serverId")({
	component: ServerHomeScreen,
});

function ServerHomeScreen() {
	const gate = useSignedInGate();
	const { serverId } = Route.useParams();
	const snapshot = useServerChannels(serverId);

	if (gate.status === "anonymous") {
		return <Navigate to="/login" replace />;
	}

	const sessionLoading = gate.status === "loading";
	const channelsLoading = !sessionLoading && snapshot === null;
	const loading = sessionLoading || channelsLoading;
	const defaultId = snapshot ? defaultTextChannelId(snapshot.channels) : null;

	if (!loading && defaultId) {
		return (
			<Navigate
				to="/channel/$channelId"
				params={{ channelId: defaultId }}
				replace
			/>
		);
	}

	return (
		<AppShell loading={loading} title={snapshot?.name ?? "Server"}>
			<main
				data-testid="screen-server-home"
				className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#313338] text-zinc-100"
			>
				{loading ? (
					<div className="flex flex-1 flex-col gap-3 p-8">
						<Skeleton className="h-8 w-40 bg-[#3f4147]" />
						<Skeleton className="h-24 w-full max-w-xl bg-[#3f4147]" />
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">
						This server has no text channels yet.
					</div>
				)}
			</main>
		</AppShell>
	);
}
