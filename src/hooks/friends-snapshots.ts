import { parseUserId, type UserId } from "@/domain/ids";
import {
	PRESENCE_DOT_CLASS,
	type Presence,
	parsePresence,
	presenceLabel,
} from "@/domain/presence";

export type FriendsTab = "online" | "all" | "pending" | "blocked";

export type FriendRelationship = "Friend" | "Incoming" | "Outgoing" | "Blocked";

export type FriendPresence = Presence;

export type FriendRow = {
	id: UserId;
	username: string;
	discriminator: string;
	displayName: string;
	avatarUrl: string;
	relationship: FriendRelationship;
	online: boolean;
	presence: FriendPresence;
	statusText: string | null;
	isBot: boolean;
};

export { PRESENCE_DOT_CLASS, presenceLabel };

export type FriendsSnapshot = {
	online: FriendRow[];
	all: FriendRow[];
	incoming: FriendRow[];
	outgoing: FriendRow[];
	blocked: FriendRow[];
};

export type FriendSnapshotInput = {
	id: unknown;
	username: unknown;
	discriminator?: unknown;
	displayName?: unknown;
	avatarUrl?: unknown;
	relationship: unknown;
	online?: unknown;
	presence?: unknown;
	statusText?: unknown;
	isBot?: unknown;
};

export const FRIEND_TABS = [
	{ value: "online", label: "Online" },
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "blocked", label: "Blocked" },
] as const satisfies readonly { value: FriendsTab; label: string }[];

export const FRIEND_TAB_EMPTY: Record<FriendsTab, string> = {
	online: "No friends are online.",
	all: "No friends yet.",
	pending: "No pending friend requests.",
	blocked: "No blocked users.",
};

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parseRelationship(value: unknown): FriendRelationship | null {
	if (
		value === "Friend" ||
		value === "Incoming" ||
		value === "Outgoing" ||
		value === "Blocked"
	) {
		return value;
	}
	return null;
}

export function emptyFriendsSnapshot(): FriendsSnapshot {
	return {
		online: [],
		all: [],
		incoming: [],
		outgoing: [],
		blocked: [],
	};
}

export function snapshotFriend(input: FriendSnapshotInput): FriendRow | null {
	const relationship = parseRelationship(input.relationship);
	const username = asNonEmptyString(input.username);
	if (!relationship || !username) {
		return null;
	}

	const online = input.online === true;
	const displayName = asNonEmptyString(input.displayName) ?? username;
	const statusText = asNonEmptyString(input.statusText);

	try {
		return {
			id: parseUserId(input.id),
			username,
			discriminator: asNonEmptyString(input.discriminator) ?? "",
			displayName,
			avatarUrl: asNonEmptyString(input.avatarUrl) ?? "",
			relationship,
			online,
			presence: parsePresence(input.presence, online),
			statusText,
			isBot: input.isBot === true,
		};
	} catch {
		return null;
	}
}

function byDisplayName(left: FriendRow, right: FriendRow): number {
	return left.displayName.localeCompare(right.displayName, undefined, {
		sensitivity: "base",
	});
}

export function snapshotFriends(
	inputs: readonly FriendSnapshotInput[],
): FriendsSnapshot {
	const lists = emptyFriendsSnapshot();
	for (const input of inputs) {
		const row = snapshotFriend(input);
		if (!row) {
			continue;
		}
		switch (row.relationship) {
			case "Friend":
				lists.all.push(row);
				if (row.online && row.presence !== "Invisible") {
					lists.online.push(row);
				}
				break;
			case "Incoming":
				lists.incoming.push(row);
				break;
			case "Outgoing":
				lists.outgoing.push(row);
				break;
			case "Blocked":
				lists.blocked.push(row);
				break;
			default: {
				const _exhaustive: never = row.relationship;
				return _exhaustive;
			}
		}
	}
	lists.online.sort(byDisplayName);
	lists.all.sort(byDisplayName);
	lists.incoming.sort(byDisplayName);
	lists.outgoing.sort(byDisplayName);
	lists.blocked.sort(byDisplayName);
	return lists;
}

export function friendSubtitle(row: FriendRow): string {
	switch (row.relationship) {
		case "Incoming":
			return "Incoming Friend Request";
		case "Outgoing":
			return "Outgoing Friend Request";
		case "Blocked":
			return "Blocked";
		case "Friend":
			return row.statusText ?? presenceLabel(row.presence);
		default: {
			const _exhaustive: never = row.relationship;
			return _exhaustive;
		}
	}
}

export function pendingBadgeLabel(count: number): string | null {
	if (count <= 0) {
		return null;
	}
	return count > 99 ? "99+" : String(count);
}

export function friendTag(row: FriendRow): string {
	return row.discriminator.length > 0
		? `${row.username}#${row.discriminator}`
		: row.username;
}
