import {
	type ChannelId,
	parseChannelId,
	parseServerId,
	parseUserId,
	type ServerId,
	type UserId,
} from "@/domain/ids";
import { type Presence, parsePresence } from "@/domain/presence";
import { avatarUrlFromRestFile } from "@/lib/avatar-url";

export type ServerSnapshot = {
	id: ServerId;
	name: string;
	iconUrl: string | null;
};

export type ConversationKind = "direct" | "group";

export type ConversationSnapshot = {
	id: ChannelId;
	kind: ConversationKind;
	name: string;
	iconUrl: string | null;
	memberCount: number | null;
	updatedAt: number;
	presence: Presence | null;
};

export type MeSnapshot = {
	id: UserId;
	username: string;
	displayName: string;
	avatarUrl: string;
	presence: Presence;
};

export type ServerSnapshotInput = {
	id: unknown;
	name: unknown;
	iconUrl?: unknown;
};

export type ConversationSnapshotInput = {
	id: unknown;
	type: unknown;
	active?: unknown;
	name?: unknown;
	displayName?: unknown;
	iconUrl?: unknown;
	memberCount?: unknown;
	updatedAt?: unknown;
	recipientOnline?: unknown;
	recipientPresence?: unknown;
};

export type MeSnapshotInput = {
	id: unknown;
	username: unknown;
	displayName?: unknown;
	avatarUrl?: unknown;
	online?: unknown;
	presence?: unknown;
};

export type ChannelTypeInput = {
	id: unknown;
	type: unknown;
};

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function asUrl(value: unknown): string | null {
	return asNonEmptyString(value);
}

export function snapshotServer(
	input: ServerSnapshotInput,
): ServerSnapshot | null {
	const name = asNonEmptyString(input.name);
	if (!name) {
		return null;
	}
	try {
		return {
			id: parseServerId(input.id),
			name,
			iconUrl: asUrl(input.iconUrl),
		};
	} catch {
		return null;
	}
}

export function snapshotServers(
	inputs: readonly ServerSnapshotInput[],
): ServerSnapshot[] {
	const servers: ServerSnapshot[] = [];
	for (const input of inputs) {
		const server = snapshotServer(input);
		if (server) {
			servers.push(server);
		}
	}
	return servers;
}

export function snapshotConversation(
	input: ConversationSnapshotInput,
): ConversationSnapshot | null {
	const type = input.type;
	let kind: ConversationKind;
	if (type === "DirectMessage") {
		if (input.active !== true) {
			return null;
		}
		kind = "direct";
	} else if (type === "Group") {
		kind = "group";
	} else {
		return null;
	}

	const name =
		asNonEmptyString(input.displayName) ??
		asNonEmptyString(input.name) ??
		(kind === "group" ? "Group" : "Direct message");

	const memberCount =
		kind === "group" && typeof input.memberCount === "number"
			? input.memberCount
			: null;

	const updatedAt =
		typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
			? input.updatedAt
			: 0;

	try {
		return {
			id: parseChannelId(input.id),
			kind,
			name,
			iconUrl: asUrl(input.iconUrl),
			memberCount,
			updatedAt,
			presence:
				kind === "direct"
					? parsePresence(
							input.recipientPresence,
							input.recipientOnline === true,
						)
					: null,
		};
	} catch {
		return null;
	}
}

export function snapshotConversations(
	inputs: readonly ConversationSnapshotInput[],
): ConversationSnapshot[] {
	const conversations: ConversationSnapshot[] = [];
	for (const input of inputs) {
		const conversation = snapshotConversation(input);
		if (conversation) {
			conversations.push(conversation);
		}
	}
	conversations.sort((left, right) => right.updatedAt - left.updatedAt);
	return conversations;
}

export function snapshotSavedNotesId(
	inputs: readonly ChannelTypeInput[],
): ChannelId | null {
	for (const input of inputs) {
		if (input.type !== "SavedMessages") {
			continue;
		}
		try {
			return parseChannelId(input.id);
		} catch {}
	}
	return null;
}

export function snapshotMe(input: MeSnapshotInput): MeSnapshot | null {
	const username = asNonEmptyString(input.username);
	if (!username) {
		return null;
	}
	const displayName = asNonEmptyString(input.displayName) ?? username;
	const avatarUrl = asUrl(input.avatarUrl);
	if (!avatarUrl) {
		return null;
	}
	const online = input.online === true;
	try {
		return {
			id: parseUserId(input.id),
			username,
			displayName,
			avatarUrl,
			presence: parsePresence(input.presence, online),
		};
	} catch {
		return null;
	}
}

export function meFromRest(
	raw: unknown,
	autumnBase: string | null,
	apiBase: string,
): MeSnapshot | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const id = asNonEmptyString(record._id);
	if (!id) {
		return null;
	}
	return snapshotMe({
		id,
		username: record.username,
		displayName: record.display_name,
		avatarUrl: avatarUrlFromRestFile(record.avatar, id, autumnBase, apiBase),
		online: record.online === true,
		presence: presenceFromRest(record.status),
	});
}

function presenceFromRest(status: unknown): string | undefined {
	if (status === null || typeof status !== "object") {
		return undefined;
	}
	const presence = (status as Record<string, unknown>).presence;
	return typeof presence === "string" ? presence : undefined;
}
