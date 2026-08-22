import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Channel, ServerMember, User } from "stoat.js";

import type { ChannelSnapshot, ChannelTypeName } from "@/hooks/chat-snapshots";
import {
	type HoistedRoleInput,
	type MemberListMember,
	snapshotMemberListMember,
} from "@/hooks/member-list-snapshots";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { userAvatarUrlFromSdk } from "@/lib/avatar-url";
import { displayNameForUser } from "@/lib/display-name";
import { getStoatClient } from "@/lib/stoat-client";

export function channelMembersQueryKey(userId: string, scopeKey: string) {
	return ["chat", userId, "members", scopeKey] as const;
}

export function membersScopeKey(channel: {
	id: string;
	serverId: string | null;
	type: ChannelTypeName;
}): string {
	if (channel.serverId) {
		return `server:${channel.serverId}`;
	}
	return `channel:${channel.id}`;
}

export function namesByIdFromMembers(
	members: readonly MemberListMember[],
): Map<string, string> {
	const map = new Map<string, string>();
	for (const member of members) {
		if (member.displayName.trim().length > 0) {
			map.set(member.id, member.displayName);
		}
	}
	return map;
}

function readUserParts(user: User | undefined): {
	displayName?: string;
	username?: string;
	online?: boolean;
	presence?: string;
	avatarUrl: string | null;
} {
	if (!user) {
		return { avatarUrl: null };
	}
	let displayName: string | undefined;
	let username: string | undefined;
	let online: boolean | undefined;
	let presence: string | undefined;
	try {
		displayName = user.displayName;
	} catch {
		displayName = undefined;
	}
	try {
		username = user.username;
	} catch {
		username = undefined;
	}
	try {
		online = user.online;
	} catch {
		online = undefined;
	}
	try {
		presence = user.presence;
	} catch {
		presence = undefined;
	}
	return {
		displayName,
		username,
		online,
		presence,
		avatarUrl: userAvatarUrlFromSdk(user) ?? null,
	};
}

function readHoistedRoles(serverId: string): HoistedRoleInput[] {
	const server = getStoatClient().servers.get(serverId);
	if (!server) {
		return [];
	}
	try {
		return server.orderedRoles
			.filter((role) => role.hoist)
			.map((role) => ({ id: role.id, name: role.name }));
	} catch {
		return [];
	}
}

function snapshotFromServerMember(
	member: ServerMember,
	hoistedRoleIds: ReadonlySet<string>,
): MemberListMember | null {
	const userId = member.id.user;
	let nickname: string | undefined;
	try {
		nickname = member.nickname;
	} catch {
		nickname = undefined;
	}
	let roleColour: string | null = null;
	try {
		roleColour = member.roleColour ?? null;
	} catch {
		roleColour = null;
	}
	let roleIds: string[] = [];
	try {
		roleIds = [...member.roles];
	} catch {
		roleIds = [];
	}
	let hoistedRoleId: string | null = null;
	try {
		hoistedRoleId = member.hoistedRole?.id ?? null;
	} catch {
		hoistedRoleId = null;
	}
	let user: User | undefined;
	try {
		user = member.user;
	} catch {
		user = undefined;
	}
	const parts = readUserParts(user);
	let memberAvatar: string | null = null;
	try {
		const animated = member.animatedAvatarURL;
		if (typeof animated === "string" && animated.length > 0) {
			memberAvatar = animated;
		}
	} catch {
		memberAvatar = null;
	}
	if (!memberAvatar) {
		try {
			const staticUrl = member.avatarURL;
			if (typeof staticUrl === "string" && staticUrl.length > 0) {
				memberAvatar = staticUrl;
			}
		} catch {
			memberAvatar = null;
		}
	}
	return snapshotMemberListMember(
		{
			id: userId,
			nickname,
			displayName: parts.displayName,
			username: parts.username,
			avatarUrl: memberAvatar ?? parts.avatarUrl,
			online: parts.online === true,
			presence: parts.presence,
			roleColour,
			roleIds,
			hoistedRoleId,
		},
		hoistedRoleIds,
	);
}

function snapshotFromUser(user: User): MemberListMember | null {
	const parts = readUserParts(user);
	return snapshotMemberListMember({
		id: user.id,
		displayName: parts.displayName,
		username: parts.username,
		avatarUrl: parts.avatarUrl,
		online: parts.online === true,
		presence: parts.presence,
	});
}

export type ChannelMembersLoad = {
	members: MemberListMember[];
	hoistedRoles: HoistedRoleInput[];
};

async function loadServerMembers(
	serverId: string,
): Promise<ChannelMembersLoad> {
	const client = getStoatClient();
	const server =
		client.servers.get(serverId) ?? (await client.servers.fetch(serverId));
	try {
		await server.syncMembers(false);
	} catch {
		try {
			await server.fetchMembers();
		} catch {
			/* use hydrated members if any */
		}
	}

	const hoistedRoles = readHoistedRoles(serverId);
	const hoistedRoleIds = new Set(hoistedRoles.map((role) => role.id));
	const members: MemberListMember[] = [];
	for (const member of client.serverMembers.values()) {
		if (member.id.server !== serverId) {
			continue;
		}
		const row = snapshotFromServerMember(member, hoistedRoleIds);
		if (row) {
			members.push(row);
		}
	}
	return { members, hoistedRoles };
}

async function loadChannelRecipients(
	channelId: string,
): Promise<ChannelMembersLoad> {
	const client = getStoatClient();
	const channel =
		client.channels.get(channelId) ?? (await client.channels.fetch(channelId));
	let recipients: User[] = [];
	try {
		recipients = [...channel.recipients];
	} catch {
		recipients = [];
	}
	const members: MemberListMember[] = [];
	for (const user of recipients) {
		const row = snapshotFromUser(user);
		if (row) {
			members.push(row);
		}
	}
	return { members, hoistedRoles: [] };
}

export async function loadChannelMembers(channel: {
	id: string;
	serverId: string | null;
	type: ChannelTypeName;
}): Promise<ChannelMembersLoad> {
	if (channel.type === "DirectMessage" || channel.type === "SavedMessages") {
		return { members: [], hoistedRoles: [] };
	}
	if (channel.serverId) {
		try {
			return await loadServerMembers(channel.serverId);
		} catch {
			return { members: [], hoistedRoles: [] };
		}
	}
	if (channel.type === "Group") {
		try {
			return await loadChannelRecipients(channel.id);
		} catch {
			return { members: [], hoistedRoles: [] };
		}
	}
	return { members: [], hoistedRoles: [] };
}

/**
 * Plain member rows + id→displayName map for mentions and message authors.
 * Shared with MemberList UI (same query key / snapshots).
 */
export function useChannelMembers(channel: ChannelSnapshot | null): {
	members: MemberListMember[];
	hoistedRoles: HoistedRoleInput[];
	namesById: Map<string, string>;
	loading: boolean;
} {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const enabled = userId !== null && channel !== null;
	const scopeKey = channel ? membersScopeKey(channel) : "none";
	const queryKey =
		userId && channel
			? channelMembersQueryKey(userId, scopeKey)
			: (["chat", "anonymous", "members"] as const);

	const query = useQuery({
		queryKey,
		queryFn: () =>
			loadChannelMembers({
				id: channel!.id,
				serverId: channel!.serverId,
				type: channel!.type,
			}),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	useEffect(() => {
		if (!enabled || !userId || !channel) {
			return;
		}
		const key = channelMembersQueryKey(userId, membersScopeKey(channel));
		const client = getStoatClient();
		const refresh = () => {
			void queryClient.invalidateQueries({ queryKey: key });
		};
		client.addListener("ready", refresh);
		client.addListener("userUpdate", refresh);
		client.addListener("serverMemberJoin", refresh);
		client.addListener("serverMemberUpdate", refresh);
		client.addListener("serverMemberLeave", refresh);
		client.addListener("channelUpdate", refresh);
		return () => {
			client.removeListener("ready", refresh);
			client.removeListener("userUpdate", refresh);
			client.removeListener("serverMemberJoin", refresh);
			client.removeListener("serverMemberUpdate", refresh);
			client.removeListener("serverMemberLeave", refresh);
			client.removeListener("channelUpdate", refresh);
		};
	}, [channel, enabled, queryClient, userId]);

	const members = query.data?.members ?? [];
	const hoistedRoles = query.data?.hoistedRoles ?? [];
	return {
		members,
		hoistedRoles,
		namesById: namesByIdFromMembers(members),
		loading: query.isPending && enabled,
	};
}

/** Alias preferred by the member-list brief; same cache as useChannelMembers. */
export const useServerMembers = useChannelMembers;

/** Resolve a single SDK user/member pair with the shared display-name order. */
export function displayNameFromSdk(
	user: User | undefined,
	member?: ServerMember | undefined,
): string {
	let nickname: string | undefined;
	try {
		nickname = member?.nickname;
	} catch {
		nickname = undefined;
	}
	const parts = readUserParts(user);
	return displayNameForUser({
		nickname,
		displayName: parts.displayName,
		username: parts.username,
		userId: user?.id ?? member?.id.user,
	});
}

export function readChannelMembersInput(channel: Channel): {
	id: string;
	serverId: string | null;
	type: ChannelTypeName;
} | null {
	let type: ChannelTypeName;
	try {
		type = channel.type as ChannelTypeName;
	} catch {
		return null;
	}
	let serverId: string | null = null;
	try {
		serverId = channel.serverId || null;
	} catch {
		serverId = null;
	}
	return { id: channel.id, serverId, type };
}
