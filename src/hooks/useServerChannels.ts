import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Server } from "stoat.js";

import {
	type ServerChannelSnapshotInput,
	type ServerChannelsSnapshot,
	snapshotServerChannels,
} from "@/hooks/chat-snapshots";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { getStoatClient } from "@/lib/stoat-client";

export function serverChannelsQueryKey(userId: string, serverId: string) {
	return ["chat", userId, "server-channels", serverId] as const;
}

function readServerChannelInputs(server: Server): ServerChannelSnapshotInput[] {
	const inputs: ServerChannelSnapshotInput[] = [];
	const seen = new Set<string>();
	try {
		for (const category of server.orderedChannels) {
			for (const channel of category.channels) {
				if (!channel || seen.has(channel.id)) {
					continue;
				}
				seen.add(channel.id);
				try {
					let name: string | undefined;
					try {
						name = channel.name;
					} catch {
						name = channel.displayName;
					}
					inputs.push({
						id: channel.id,
						name,
						type: channel.type,
						isVoice: channel.isVoice,
					});
				} catch {}
			}
		}
	} catch {}
	return inputs;
}

export async function loadServerChannels(
	serverId: string,
): Promise<ServerChannelsSnapshot | null> {
	const client = getStoatClient();
	let server = client.servers.get(serverId);
	if (!server) {
		try {
			server = await client.servers.fetch(serverId);
		} catch {
			return null;
		}
	}

	let channels = readServerChannelInputs(server);
	if (channels.length === 0) {
		const fetched: ServerChannelSnapshotInput[] = [];
		for (const channelId of server.channelIds) {
			try {
				const channel =
					client.channels.get(channelId) ??
					(await client.channels.fetch(channelId));
				fetched.push({
					id: channel.id,
					name: channel.name,
					type: channel.type,
					isVoice: channel.isVoice,
				});
			} catch {}
		}
		channels = fetched;
	}

	return snapshotServerChannels({
		serverId: server.id,
		name: server.name,
		channels,
	});
}

export function useServerChannels(
	serverId: string | undefined,
): ServerChannelsSnapshot | null {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const enabled = userId !== null && typeof serverId === "string";
	const queryKey =
		userId && serverId
			? serverChannelsQueryKey(userId, serverId)
			: (["chat", "anonymous", "server-channels"] as const);

	const query = useQuery({
		queryKey,
		queryFn: () => loadServerChannels(serverId ?? ""),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	useEffect(() => {
		if (!enabled || !serverId || !userId) {
			return;
		}
		const key = serverChannelsQueryKey(userId, serverId);
		const client = getStoatClient();
		const refresh = () => {
			void queryClient.invalidateQueries({ queryKey: key });
		};
		client.addListener("ready", refresh);
		client.addListener("channelCreate", refresh);
		client.addListener("channelUpdate", refresh);
		client.addListener("channelDelete", refresh);
		client.addListener("serverUpdate", refresh);
		return () => {
			client.removeListener("ready", refresh);
			client.removeListener("channelCreate", refresh);
			client.removeListener("channelUpdate", refresh);
			client.removeListener("channelDelete", refresh);
			client.removeListener("serverUpdate", refresh);
		};
	}, [enabled, queryClient, serverId, userId]);

	return query.data ?? null;
}
