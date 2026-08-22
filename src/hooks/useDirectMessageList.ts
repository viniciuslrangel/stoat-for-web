import { useQuery } from "@tanstack/react-query";
import type { Client } from "stoat.js";

import type { ChannelId } from "@/domain/ids";
import {
	type ChannelTypeInput,
	type ConversationSnapshot,
	type ConversationSnapshotInput,
	snapshotConversations,
	snapshotSavedNotesId,
} from "@/hooks/shell-snapshots";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { getStoatClient } from "@/lib/stoat-client";

export type HomeChannelSnapshots = {
	conversations: ConversationSnapshot[];
	savedNotesId: ChannelId | null;
};

export function directMessageListQueryKey(userId: string) {
	return ["shell", userId, "dms"] as const;
}

function readConversationInputs(client: Client): ConversationSnapshotInput[] {
	const inputs: ConversationSnapshotInput[] = [];
	for (const channel of client.channels.toList()) {
		try {
			let iconUrl: string | undefined;
			try {
				iconUrl = channel.animatedIconURL ?? channel.iconURL;
			} catch {
				iconUrl = undefined;
			}
			let displayName: string | undefined;
			try {
				displayName = channel.displayName;
			} catch {
				displayName = undefined;
			}
			let recipientOnline: boolean | undefined;
			let recipientPresence: string | undefined;
			if (channel.type === "DirectMessage") {
				try {
					const recipient = channel.recipient;
					if (recipient) {
						recipientOnline = recipient.online;
						recipientPresence = recipient.presence;
					}
				} catch {
					recipientOnline = undefined;
					recipientPresence = undefined;
				}
			}
			inputs.push({
				id: channel.id,
				type: channel.type,
				active: channel.active,
				name: channel.name,
				displayName,
				iconUrl,
				memberCount:
					channel.type === "Group" ? channel.recipientIds.size : null,
				updatedAt: channel.updatedAt.getTime(),
				recipientOnline,
				recipientPresence,
			});
		} catch {}
	}
	return inputs;
}

function readChannelTypes(client: Client): ChannelTypeInput[] {
	const inputs: ChannelTypeInput[] = [];
	for (const channel of client.channels.toList()) {
		try {
			inputs.push({ id: channel.id, type: channel.type });
		} catch {}
	}
	return inputs;
}

export function loadHomeChannelSnapshots(): HomeChannelSnapshots {
	const client = getStoatClient();
	return {
		conversations: snapshotConversations(readConversationInputs(client)),
		savedNotesId: snapshotSavedNotesId(readChannelTypes(client)),
	};
}

function useHomeChannelSnapshots(): HomeChannelSnapshots {
	const userId = useSignedInUserId();

	const query = useQuery({
		queryKey: userId
			? directMessageListQueryKey(userId)
			: ["shell", "anonymous", "dms"],
		queryFn: loadHomeChannelSnapshots,
		enabled: userId !== null,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	return query.data ?? { conversations: [], savedNotesId: null };
}

export function useDirectMessageList(): ConversationSnapshot[] {
	return useHomeChannelSnapshots().conversations;
}

export function useSavedNotesChannelId(): ChannelId | null {
	return useHomeChannelSnapshots().savedNotesId;
}
