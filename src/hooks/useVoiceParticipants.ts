import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { Presence } from "@/domain/presence";
import type { MemberListMember } from "@/hooks/member-list-snapshots";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { useChannelSnapshot } from "@/hooks/useChannelSnapshot";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { userAvatarUrlFromSdk } from "@/lib/avatar-url";
import { displayNameForUser } from "@/lib/display-name";
import { getStoatClient } from "@/lib/stoat-client";

export type VoiceParticipantPreview = {
	userId: string;
	name: string;
	avatarUrl: string | null;
	presence: Presence | null;
};

const VOICE_WS_EVENTS = new Set([
	"Ready",
	"VoiceChannelJoin",
	"VoiceChannelLeave",
	"VoiceChannelMove",
	"UserVoiceStateUpdate",
]);

export function voiceParticipantsQueryKey(userId: string, channelId: string) {
	return ["voice", userId, "participants", channelId] as const;
}

export function snapshotVoiceParticipants(
	channelId: string,
): VoiceParticipantPreview[] {
	const client = getStoatClient();
	const channel = client.channels.get(channelId);
	if (!channel) {
		return [];
	}
	const rows: VoiceParticipantPreview[] = [];
	for (const [userId] of channel.voiceParticipants) {
		const user = client.users.get(userId);
		if (!user) {
			rows.push({
				userId,
				name: displayNameForUser({ userId }),
				avatarUrl: null,
				presence: null,
			});
			continue;
		}
		let username: string | undefined;
		let displayName: string | undefined;
		let online = false;
		let presence: string | undefined;
		try {
			username = user.username;
		} catch {}
		try {
			displayName = user.displayName;
		} catch {}
		try {
			online = user.online;
		} catch {}
		try {
			presence = user.presence;
		} catch {}
		rows.push({
			userId,
			name: displayNameForUser({ username, displayName, userId }),
			avatarUrl: userAvatarUrlFromSdk(user) ?? null,
			presence:
				presence === "Online" ||
				presence === "Idle" ||
				presence === "Focus" ||
				presence === "Busy" ||
				presence === "Invisible"
					? presence
					: online
						? "Online"
						: "Invisible",
		});
	}
	return rows;
}

export function mergeVoiceParticipantProfile(
	participant: VoiceParticipantPreview,
	member:
		| Pick<MemberListMember, "displayName" | "avatarUrl" | "presence">
		| undefined,
): VoiceParticipantPreview {
	if (!member) {
		return participant;
	}
	return {
		...participant,
		name: member.displayName,
		avatarUrl: member.avatarUrl ?? participant.avatarUrl,
		presence: member.presence,
	};
}

export function useVoiceParticipants(
	channelId: string | undefined,
): VoiceParticipantPreview[] {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const channel = useChannelSnapshot(channelId);
	const { members, namesById } = useChannelMembers(channel);
	const enabled = userId !== null && typeof channelId === "string";
	const queryKey =
		userId && channelId
			? voiceParticipantsQueryKey(userId, channelId)
			: (["voice", "anonymous", "participants"] as const);

	const query = useQuery({
		queryKey,
		queryFn: () => snapshotVoiceParticipants(channelId ?? ""),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	useEffect(() => {
		if (!enabled || !channelId || !userId) {
			return;
		}
		const key = voiceParticipantsQueryKey(userId, channelId);
		const client = getStoatClient();
		const refresh = () => {
			void queryClient.invalidateQueries({ queryKey: key });
		};
		const onEvent = (event: { type?: string }) => {
			if (event?.type && VOICE_WS_EVENTS.has(event.type)) {
				refresh();
			}
		};
		client.addListener("ready", refresh);
		client.events.on("event", onEvent);
		return () => {
			client.removeListener("ready", refresh);
			client.events.removeListener("event", onEvent);
		};
	}, [channelId, enabled, queryClient, userId]);

	const memberById = new Map<string, MemberListMember>(
		members.map((member) => [member.id, member]),
	);
	return (query.data ?? []).map((participant) =>
		mergeVoiceParticipantProfile(
			{
				...participant,
				name: namesById.get(participant.userId) ?? participant.name,
			},
			memberById.get(participant.userId),
		),
	);
}
