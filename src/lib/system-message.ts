/**
 * Plain system-message discriminant (API shape, no SDK classes).
 * Parse at the message-snapshot boundary; format in pure functions.
 */

export type SystemMessageData =
	| { type: "text"; content: string }
	| { type: "user_added"; userId: string; byId: string }
	| { type: "user_remove"; userId: string; byId: string }
	| { type: "user_joined"; userId: string }
	| { type: "user_left"; userId: string; scope: "server" | "group" }
	| { type: "user_kicked"; userId: string }
	| { type: "user_banned"; userId: string }
	| { type: "channel_renamed"; name: string; byId: string }
	| { type: "channel_description_changed"; byId: string }
	| { type: "channel_icon_changed"; byId: string }
	| { type: "channel_ownership_changed"; fromId: string; toId: string }
	| { type: "message_pinned"; messageId: string; byId: string }
	| { type: "message_unpinned"; messageId: string; byId: string }
	| {
			type: "call_started";
			byId: string;
			startedAt: number;
			finishedAt: number | null;
	  };

export type SystemMessageSegment =
	| { kind: "text"; value: string }
	| { kind: "emphasis"; value: string };

export type ResolveSystemUserName = (userId: string) => string;

export function shortUserLabel(userId: string): string {
	const trimmed = userId.trim();
	if (trimmed.length === 0) {
		return "Someone";
	}
	if (trimmed.length <= 8) {
		return trimmed;
	}
	return trimmed.slice(0, 8);
}

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function parseSystemMessage(
	raw: unknown,
	options: { isServer: boolean } = { isServer: true },
): SystemMessageData | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const type = asNonEmptyString(record.type);
	if (!type) {
		return null;
	}

	switch (type) {
		case "text": {
			const content = typeof record.content === "string" ? record.content : "";
			return { type: "text", content };
		}
		case "user_added": {
			const userId = asNonEmptyString(record.id);
			const byId = asNonEmptyString(record.by);
			if (!userId || !byId) {
				return null;
			}
			return { type: "user_added", userId, byId };
		}
		case "user_remove": {
			const userId = asNonEmptyString(record.id);
			const byId = asNonEmptyString(record.by);
			if (!userId || !byId) {
				return null;
			}
			return { type: "user_remove", userId, byId };
		}
		case "user_joined": {
			const userId = asNonEmptyString(record.id);
			if (!userId) {
				return null;
			}
			return { type: "user_joined", userId };
		}
		case "user_left": {
			const userId = asNonEmptyString(record.id);
			if (!userId) {
				return null;
			}
			return {
				type: "user_left",
				userId,
				scope: options.isServer ? "server" : "group",
			};
		}
		case "user_kicked": {
			const userId = asNonEmptyString(record.id);
			if (!userId) {
				return null;
			}
			return { type: "user_kicked", userId };
		}
		case "user_banned": {
			const userId = asNonEmptyString(record.id);
			if (!userId) {
				return null;
			}
			return { type: "user_banned", userId };
		}
		case "channel_renamed": {
			const name = asNonEmptyString(record.name);
			const byId = asNonEmptyString(record.by);
			if (!name || !byId) {
				return null;
			}
			return { type: "channel_renamed", name, byId };
		}
		case "channel_description_changed": {
			const byId = asNonEmptyString(record.by);
			if (!byId) {
				return null;
			}
			return { type: "channel_description_changed", byId };
		}
		case "channel_icon_changed": {
			const byId = asNonEmptyString(record.by);
			if (!byId) {
				return null;
			}
			return { type: "channel_icon_changed", byId };
		}
		case "channel_ownership_changed": {
			const fromId = asNonEmptyString(record.from);
			const toId = asNonEmptyString(record.to);
			if (!fromId || !toId) {
				return null;
			}
			return { type: "channel_ownership_changed", fromId, toId };
		}
		case "message_pinned": {
			const messageId = asNonEmptyString(record.id);
			const byId = asNonEmptyString(record.by);
			if (!messageId || !byId) {
				return null;
			}
			return { type: "message_pinned", messageId, byId };
		}
		case "message_unpinned": {
			const messageId = asNonEmptyString(record.id);
			const byId = asNonEmptyString(record.by);
			if (!messageId || !byId) {
				return null;
			}
			return { type: "message_unpinned", messageId, byId };
		}
		case "call_started": {
			const byId = asNonEmptyString(record.by);
			if (!byId) {
				return null;
			}
			const finishedAt =
				typeof record.finished_at === "string" ||
				typeof record.finished_at === "number"
					? Date.parse(String(record.finished_at))
					: null;
			const startedAt =
				typeof record.started_at === "number" &&
				Number.isFinite(record.started_at)
					? record.started_at
					: 0;
			return {
				type: "call_started",
				byId,
				startedAt,
				finishedAt:
					finishedAt !== null && Number.isFinite(finishedAt)
						? finishedAt
						: null,
			};
		}
		default:
			return null;
	}
}

function name(
	resolve: ResolveSystemUserName,
	userId: string,
): SystemMessageSegment {
	return { kind: "emphasis", value: resolve(userId) };
}

function text(value: string): SystemMessageSegment {
	return { kind: "text", value };
}

function formatDurationMs(ms: number): string {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	if (totalSeconds < 60) {
		return `${totalSeconds}s`;
	}
	const totalMinutes = Math.round(totalSeconds / 60);
	if (totalMinutes < 60) {
		return `${totalMinutes}m`;
	}
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}

export function formatSystemMessageSegments(
	system: SystemMessageData,
	resolveName: ResolveSystemUserName = shortUserLabel,
): SystemMessageSegment[] {
	switch (system.type) {
		case "text":
			return [text(system.content)];
		case "user_added":
			return [
				name(resolveName, system.userId),
				text(" has been added by "),
				name(resolveName, system.byId),
			];
		case "user_remove":
			return [
				name(resolveName, system.userId),
				text(" has been removed by "),
				name(resolveName, system.byId),
			];
		case "user_joined":
			return [name(resolveName, system.userId), text(" joined the server")];
		case "user_left":
			return [
				name(resolveName, system.userId),
				text(system.scope === "group" ? " left the group" : " left the server"),
			];
		case "user_kicked":
			return [
				name(resolveName, system.userId),
				text(" has been kicked from the server"),
			];
		case "user_banned":
			return [
				name(resolveName, system.userId),
				text(" has been banned from the server"),
			];
		case "channel_renamed":
			return [
				name(resolveName, system.byId),
				text(" updated the channel name to "),
				{ kind: "emphasis", value: system.name },
			];
		case "channel_description_changed":
			return [
				name(resolveName, system.byId),
				text(" updated the channel description"),
			];
		case "channel_icon_changed":
			return [
				name(resolveName, system.byId),
				text(" updated the channel icon"),
			];
		case "channel_ownership_changed":
			return [
				name(resolveName, system.fromId),
				text(" transferred ownership to "),
				name(resolveName, system.toId),
			];
		case "message_pinned":
			return [name(resolveName, system.byId), text(" pinned a message")];
		case "message_unpinned":
			return [name(resolveName, system.byId), text(" unpinned a message")];
		case "call_started": {
			if (
				system.finishedAt !== null &&
				system.startedAt > 0 &&
				system.finishedAt >= system.startedAt
			) {
				return [
					name(resolveName, system.byId),
					text(" started a call that lasted "),
					{
						kind: "emphasis",
						value: formatDurationMs(system.finishedAt - system.startedAt),
					},
				];
			}
			return [name(resolveName, system.byId), text(" started a call")];
		}
		default: {
			const _exhaustive: never = system;
			void _exhaustive;
			return [];
		}
	}
}

export function formatSystemMessage(
	system: SystemMessageData,
	resolveName: ResolveSystemUserName = shortUserLabel,
): string {
	return formatSystemMessageSegments(system, resolveName)
		.map((segment) => segment.value)
		.join("");
}

export function collectSystemUserIds(system: SystemMessageData): string[] {
	switch (system.type) {
		case "text":
			return [];
		case "user_added":
		case "user_remove":
			return [system.userId, system.byId];
		case "user_joined":
		case "user_left":
		case "user_kicked":
		case "user_banned":
			return [system.userId];
		case "channel_renamed":
		case "channel_description_changed":
		case "channel_icon_changed":
		case "message_pinned":
		case "message_unpinned":
		case "call_started":
			return [system.byId];
		case "channel_ownership_changed":
			return [system.fromId, system.toId];
		default: {
			const _exhaustive: never = system;
			void _exhaustive;
			return [];
		}
	}
}
