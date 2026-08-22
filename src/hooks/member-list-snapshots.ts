import { parseUserId, type UserId } from "@/domain/ids";
import { type Presence, parsePresence } from "@/domain/presence";
import { displayNameForUser } from "@/lib/display-name";

export type MemberListMember = {
	id: UserId;
	displayName: string;
	avatarUrl: string | null;
	presence: Presence;
	online: boolean;
	roleColour: string | null;
	/** Hoisted role id when online and assigned; null means default Online bucket. */
	hoistedRoleId: string | null;
};

export type HoistedRoleInput = {
	id: string;
	name: string;
};

export type MemberListSection = {
	key: string;
	label: string;
	members: MemberListMember[];
};

export type MemberListSnapshot = {
	sections: MemberListSection[];
	onlineCount: number;
};

export type MemberListMemberInput = {
	id: unknown;
	nickname?: unknown;
	displayName?: unknown;
	username?: unknown;
	avatarUrl?: unknown;
	online?: unknown;
	presence?: unknown;
	roleColour?: unknown;
	hoistedRoleId?: unknown;
	/** Role ids on the member, highest-priority hoist wins (Solid order). */
	roleIds?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: string[] = [];
	for (const entry of value) {
		const id = asNonEmptyString(entry);
		if (id) {
			out.push(id);
		}
	}
	return out;
}

export function emptyMemberListSnapshot(): MemberListSnapshot {
	return { sections: [], onlineCount: 0 };
}

export function snapshotMemberListMember(
	input: MemberListMemberInput,
	hoistedRoleIds: ReadonlySet<string> = new Set(),
): MemberListMember | null {
	const username = asNonEmptyString(input.username);
	const userIdRaw = asNonEmptyString(input.id);
	if (!userIdRaw) {
		return null;
	}

	const online = input.online === true;
	const roleIds = asStringList(input.roleIds);
	let hoistedRoleId: string | null = asNonEmptyString(input.hoistedRoleId);
	if (hoistedRoleId === null && online && roleIds.length > 0) {
		for (const roleId of roleIds) {
			if (hoistedRoleIds.has(roleId)) {
				hoistedRoleId = roleId;
				break;
			}
		}
	}
	if (!online) {
		hoistedRoleId = null;
	}

	try {
		return {
			id: parseUserId(userIdRaw),
			displayName: displayNameForUser({
				nickname: asNonEmptyString(input.nickname),
				displayName: asNonEmptyString(input.displayName),
				username,
				userId: userIdRaw,
			}),
			avatarUrl: asNonEmptyString(input.avatarUrl),
			online,
			presence: parsePresence(input.presence, online),
			roleColour: asNonEmptyString(input.roleColour),
			hoistedRoleId,
		};
	} catch {
		return null;
	}
}

function byDisplayName(
	left: MemberListMember,
	right: MemberListMember,
): number {
	return left.displayName.localeCompare(right.displayName, undefined, {
		sensitivity: "base",
	});
}

/**
 * Discord/Solid grouping: hoisted roles (online only), then Online, then Offline.
 * Empty sections are omitted.
 */
export function buildMemberListSections(
	members: readonly MemberListMember[],
	hoistedRoles: readonly HoistedRoleInput[] = [],
): MemberListSnapshot {
	const byRole = new Map<string, MemberListMember[]>();
	byRole.set("online", []);
	byRole.set("offline", []);
	for (const role of hoistedRoles) {
		byRole.set(role.id, []);
	}

	for (const member of members) {
		if (!member.online) {
			byRole.get("offline")!.push(member);
			continue;
		}
		if (member.hoistedRoleId && byRole.has(member.hoistedRoleId)) {
			byRole.get(member.hoistedRoleId)!.push(member);
			continue;
		}
		byRole.get("online")!.push(member);
	}

	const sections: MemberListSection[] = [];
	let onlineCount = 0;

	for (const role of hoistedRoles) {
		const list = byRole.get(role.id) ?? [];
		if (list.length === 0) {
			continue;
		}
		list.sort(byDisplayName);
		onlineCount += list.length;
		sections.push({
			key: `role:${role.id}`,
			label: role.name,
			members: list,
		});
	}

	const online = byRole.get("online") ?? [];
	if (online.length > 0) {
		online.sort(byDisplayName);
		onlineCount += online.length;
		sections.push({
			key: "online",
			label: "Online",
			members: online,
		});
	}

	const offline = byRole.get("offline") ?? [];
	if (offline.length > 0) {
		offline.sort(byDisplayName);
		sections.push({
			key: "offline",
			label: "Offline",
			members: offline,
		});
	}

	return { sections, onlineCount };
}

/** Flat group DM list under a single Members header (Solid GroupMemberSidebar). */
export function buildGroupMemberList(
	members: readonly MemberListMember[],
): MemberListSnapshot {
	const sorted = [...members].sort(byDisplayName);
	if (sorted.length === 0) {
		return emptyMemberListSnapshot();
	}
	return {
		sections: [
			{
				key: "members",
				label: "Members",
				members: sorted,
			},
		],
		onlineCount: sorted.filter((row) => row.online).length,
	};
}
