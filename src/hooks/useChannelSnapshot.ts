import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Channel } from "stoat.js";

import {
	type ChannelSnapshot,
	type ChannelSnapshotInput,
	snapshotChannel,
	snapshotChannelFromRest,
} from "@/hooks/chat-snapshots";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { getStoatClient } from "@/lib/stoat-client";

export function channelSnapshotQueryKey(userId: string, channelId: string) {
	return ["chat", userId, "channel", channelId] as const;
}

function memberNamesFromChannel(channel: Channel): string[] {
	try {
		return channel.recipients
			.map((user) => {
				try {
					return user.displayName || user.username;
				} catch {
					return "";
				}
			})
			.filter((name) => name.length > 0);
	} catch {
		return [];
	}
}

export function readChannelInput(channel: Channel): ChannelSnapshotInput {
	let displayName: string | undefined;
	try {
		displayName = channel.displayName;
	} catch {
		displayName = undefined;
	}
	let name: string | undefined;
	try {
		name = channel.name;
	} catch {
		name = undefined;
	}
	let serverId: string | undefined;
	try {
		serverId = channel.serverId || undefined;
	} catch {
		serverId = undefined;
	}
	return {
		id: channel.id,
		name,
		displayName,
		type: channel.type,
		serverId,
		memberNames: memberNamesFromChannel(channel),
		isVoice: channel.isVoice,
	};
}

export async function loadChannelSnapshot(
	channelId: string,
): Promise<ChannelSnapshot | null> {
	const client = getStoatClient();
	const existing = client.channels.get(channelId);
	if (existing) {
		return snapshotChannel(readChannelInput(existing));
	}

	try {
		const fetched = await client.channels.fetch(channelId);
		return snapshotChannel(readChannelInput(fetched));
	} catch {
		try {
			const raw = await client.api.get(`/channels/${channelId as ""}`);
			return snapshotChannelFromRest(raw);
		} catch {
			return null;
		}
	}
}

export function useChannelSnapshot(
	channelId: string | undefined,
): ChannelSnapshot | null {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const enabled = userId !== null && typeof channelId === "string";
	const queryKey =
		userId && channelId
			? channelSnapshotQueryKey(userId, channelId)
			: (["chat", "anonymous", "channel"] as const);

	const query = useQuery({
		queryKey,
		queryFn: () => loadChannelSnapshot(channelId ?? ""),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	useEffect(() => {
		if (!enabled || !channelId || !userId) {
			return;
		}
		const key = channelSnapshotQueryKey(userId, channelId);
		const client = getStoatClient();
		const refresh = () => {
			void queryClient.invalidateQueries({ queryKey: key });
		};
		client.addListener("ready", refresh);
		client.addListener("channelUpdate", refresh);
		client.addListener("channelDelete", refresh);
		return () => {
			client.removeListener("ready", refresh);
			client.removeListener("channelUpdate", refresh);
			client.removeListener("channelDelete", refresh);
		};
	}, [channelId, enabled, queryClient, userId]);

	return query.data ?? null;
}
