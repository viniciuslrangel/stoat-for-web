import {
	type ChannelId,
	parseChannelId,
	parseMessageId,
	parseServerId,
	type ServerId,
} from "@/domain/ids";
import { type Presence, parsePresence } from "@/domain/presence";
import {
	autumnFileUrl,
	avatarUrlFromRestFile,
	isGifContentType,
} from "@/lib/avatar-url";
import { displayNameForUser } from "@/lib/display-name";
import type { MessageAttachmentSnapshot } from "@/lib/message-content";
import {
	collectSystemUserIds,
	parseSystemMessage,
	type SystemMessageData,
} from "@/lib/system-message";

export type { MessageAttachmentSnapshot };

export const CHANNEL_TYPES = [
	"SavedMessages",
	"DirectMessage",
	"Group",
	"TextChannel",
	"VoiceChannel",
] as const;

export type ChannelTypeName = (typeof CHANNEL_TYPES)[number];

export type ChannelSnapshot = {
	id: ChannelId;
	name: string;
	type: ChannelTypeName;
	serverId: ServerId | null;
	memberNames: string[];
	/** Stoat VC2: DM/Group always, or text channel with a voice object. */
	isVoice: boolean;
};

export type ServerChannelSnapshot = {
	id: ChannelId;
	name: string;
	type: ChannelTypeName;
	isVoice: boolean;
};

export type ServerChannelsSnapshot = {
	serverId: ServerId;
	name: string;
	channels: ServerChannelSnapshot[];
};

export type MessageSnapshot = {
	id: string;
	authorId: string | null;
	authorName: string;
	/** Autumn or default avatar URL. Null means initials fallback. */
	authorAvatarUrl: string | null;
	authorPresence: Presence | null;
	content: string;
	/** Plain Autumn file snapshots; never SDK File objects. */
	attachments: readonly MessageAttachmentSnapshot[];
	/** Plain system-message discriminant when this row is a Stoat system event. */
	system: SystemMessageData | null;
	/** Display names for user ids referenced by `system`, resolved at the boundary. */
	systemNames: Readonly<Record<string, string>>;
	createdAt: number;
};

export type ChannelSnapshotInput = {
	id: unknown;
	name?: unknown;
	displayName?: unknown;
	type: unknown;
	serverId?: unknown;
	memberNames?: unknown;
	isVoice?: unknown;
	voice?: unknown;
};

export type ServerChannelSnapshotInput = {
	id: unknown;
	name?: unknown;
	type: unknown;
	isVoice?: unknown;
	voice?: unknown;
};

export type ServerChannelsSnapshotInput = {
	serverId: unknown;
	name: unknown;
	channels: readonly ServerChannelSnapshotInput[];
};

export type MessageSnapshotInput = {
	id: unknown;
	authorId?: unknown;
	authorName?: unknown;
	authorAvatarUrl?: unknown;
	authorPresence?: unknown;
	authorOnline?: unknown;
	content?: unknown;
	attachments?: readonly MessageAttachmentSnapshot[];
	system?: SystemMessageData | null;
	systemNames?: Readonly<Record<string, string>>;
	createdAt?: unknown;
};

export type MessageRestOptions = {
	autumnBase: string | null;
	apiBase: string;
	/** Server text/voice channels use "left the server"; groups use "left the group". */
	isServer?: boolean;
};

type RestAuthorInfo = {
	name: string;
	avatarUrl: string | null;
	presence: Presence | null;
};

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function isChannelType(value: unknown): value is ChannelTypeName {
	return (
		value === "SavedMessages" ||
		value === "DirectMessage" ||
		value === "Group" ||
		value === "TextChannel" ||
		value === "VoiceChannel"
	);
}

/** Matches stoat.js Channel.isVoice (DM/Group, VoiceChannel, or voice object). */
export function channelIsVoice(input: {
	type: ChannelTypeName;
	isVoice?: unknown;
	voice?: unknown;
}): boolean {
	if (input.isVoice === true) {
		return true;
	}
	if (input.type === "DirectMessage" || input.type === "Group") {
		return true;
	}
	if (input.type === "VoiceChannel") {
		return true;
	}
	return typeof input.voice === "object" && input.voice !== null;
}

function fallbackChannelName(type: ChannelTypeName): string {
	switch (type) {
		case "SavedMessages":
			return "Saved Notes";
		case "DirectMessage":
			return "Direct message";
		case "Group":
			return "Group";
		case "TextChannel":
			return "text-channel";
		case "VoiceChannel":
			return "voice-channel";
	}
}

export function snapshotChannel(
	input: ChannelSnapshotInput,
): ChannelSnapshot | null {
	if (!isChannelType(input.type)) {
		return null;
	}

	const name =
		asNonEmptyString(input.displayName) ??
		asNonEmptyString(input.name) ??
		fallbackChannelName(input.type);

	const memberNames: string[] = [];
	if (Array.isArray(input.memberNames)) {
		for (const entry of input.memberNames) {
			const memberName = asNonEmptyString(entry);
			if (memberName) {
				memberNames.push(memberName);
			}
		}
	}

	let serverId: ServerId | null = null;
	if (input.serverId !== undefined && input.serverId !== null) {
		try {
			serverId = parseServerId(input.serverId);
		} catch {
			serverId = null;
		}
	}

	try {
		return {
			id: parseChannelId(input.id),
			name,
			type: input.type,
			serverId,
			memberNames,
			isVoice: channelIsVoice({
				type: input.type,
				isVoice: input.isVoice,
				voice: input.voice,
			}),
		};
	} catch {
		return null;
	}
}

export function snapshotChannelFromRest(raw: unknown): ChannelSnapshot | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	return snapshotChannel({
		id: record._id,
		name: record.name,
		type: record.channel_type,
		serverId: record.server,
		voice: record.voice,
	});
}

export function snapshotServerChannel(
	input: ServerChannelSnapshotInput,
): ServerChannelSnapshot | null {
	if (!isChannelType(input.type)) {
		return null;
	}
	const name = asNonEmptyString(input.name) ?? fallbackChannelName(input.type);
	try {
		return {
			id: parseChannelId(input.id),
			name,
			type: input.type,
			isVoice: channelIsVoice({
				type: input.type,
				isVoice: input.isVoice,
				voice: input.voice,
			}),
		};
	} catch {
		return null;
	}
}

export function snapshotServerChannels(
	input: ServerChannelsSnapshotInput,
): ServerChannelsSnapshot | null {
	const name = asNonEmptyString(input.name);
	if (!name) {
		return null;
	}
	const channels: ServerChannelSnapshot[] = [];
	for (const channel of input.channels) {
		const row = snapshotServerChannel(channel);
		if (row) {
			channels.push(row);
		}
	}
	try {
		return {
			serverId: parseServerId(input.serverId),
			name,
			channels,
		};
	} catch {
		return null;
	}
}

export function defaultTextChannelId(
	channels: readonly ServerChannelSnapshot[],
): ChannelId | null {
	const text = channels.find(
		(channel) => channel.type === "TextChannel" && !channel.isVoice,
	);
	return text?.id ?? channels[0]?.id ?? null;
}

export function snapshotMessage(
	input: MessageSnapshotInput,
): MessageSnapshot | null {
	const authorId = asNonEmptyString(input.authorId);
	const authorName =
		asNonEmptyString(input.authorName) ??
		displayNameForUser({ userId: authorId });
	const content = typeof input.content === "string" ? input.content : "";
	const createdAt =
		typeof input.createdAt === "number" && Number.isFinite(input.createdAt)
			? input.createdAt
			: 0;
	const authorAvatarUrl = asNonEmptyString(input.authorAvatarUrl);
	const authorPresence = resolveAuthorPresence(
		input.authorPresence,
		input.authorOnline,
	);
	const system = input.system ?? null;
	const systemNames = system
		? freezeSystemNames(input.systemNames, system)
		: {};
	const attachments = input.attachments ?? [];
	try {
		return {
			id: parseMessageId(input.id),
			authorId,
			authorName,
			authorAvatarUrl,
			authorPresence,
			content,
			attachments,
			system,
			systemNames,
			createdAt,
		};
	} catch {
		return null;
	}
}

export function snapshotAttachmentFromRest(
	raw: unknown,
	autumnBase: string | null,
): MessageAttachmentSnapshot | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const id = asNonEmptyString(record._id);
	if (!id || !autumnBase) {
		return null;
	}
	const tag = asNonEmptyString(record.tag) ?? "attachments";
	const contentType =
		typeof record.content_type === "string"
			? record.content_type
			: typeof record.contentType === "string"
				? record.contentType
				: null;
	const filename =
		typeof record.filename === "string" && record.filename.trim().length > 0
			? record.filename.trim()
			: null;
	const metadata =
		record.metadata !== null && typeof record.metadata === "object"
			? (record.metadata as Record<string, unknown>)
			: null;
	const metaType = typeof metadata?.type === "string" ? metadata.type : null;
	const kind: MessageAttachmentSnapshot["kind"] =
		metaType === "Image" ||
		(typeof contentType === "string" &&
			contentType.toLowerCase().startsWith("image/"))
			? "image"
			: "file";
	const url = autumnFileUrl({
		autumnBase,
		tag,
		fileId: id,
		contentType,
		animated: kind === "image" && isGifContentType(contentType),
	});
	return { id, url, filename, contentType, kind };
}

export function snapshotAttachmentsFromRest(
	raw: unknown,
	autumnBase: string | null,
): MessageAttachmentSnapshot[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const out: MessageAttachmentSnapshot[] = [];
	for (const entry of raw) {
		const attachment = snapshotAttachmentFromRest(entry, autumnBase);
		if (attachment) {
			out.push(attachment);
		}
	}
	return out;
}

function freezeSystemNames(
	provided: Readonly<Record<string, string>> | undefined,
	system: SystemMessageData,
): Readonly<Record<string, string>> {
	const names: Record<string, string> = {};
	for (const userId of collectSystemUserIds(system)) {
		const fromMap = provided?.[userId];
		if (typeof fromMap === "string" && fromMap.trim().length > 0) {
			names[userId] = fromMap.trim();
		}
	}
	return names;
}

function resolveAuthorPresence(
	presence: unknown,
	online: unknown,
): Presence | null {
	if (
		presence === "Online" ||
		presence === "Idle" ||
		presence === "Focus" ||
		presence === "Busy" ||
		presence === "Invisible"
	) {
		return presence;
	}
	if (presence === undefined && online === undefined) {
		return null;
	}
	return parsePresence(presence, online === true);
}

export function snapshotMessageFromRest(
	raw: unknown,
	usersById: ReadonlyMap<string, RestAuthorInfo> = new Map(),
	options?: Pick<MessageRestOptions, "isServer" | "autumnBase">,
): MessageSnapshot | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const authorId = asNonEmptyString(record.author);
	const author = authorId ? usersById.get(authorId) : undefined;
	const authorName = author?.name ?? displayNameForUser({ userId: authorId });
	const createdAt = ulidTime(record._id);
	const system = parseSystemMessage(record.system, {
		isServer: options?.isServer ?? true,
	});
	const content = typeof record.content === "string" ? record.content : "";
	const systemNames: Record<string, string> = {};
	if (system) {
		for (const userId of collectSystemUserIds(system)) {
			const user = usersById.get(userId);
			if (user) {
				systemNames[userId] = user.name;
			}
		}
	}
	const attachments = snapshotAttachmentsFromRest(
		record.attachments,
		options?.autumnBase ?? null,
	);
	return snapshotMessage({
		id: record._id,
		authorId,
		authorName,
		authorAvatarUrl: author?.avatarUrl ?? undefined,
		authorPresence: author?.presence ?? undefined,
		content,
		attachments,
		system,
		systemNames,
		createdAt,
	});
}

export function snapshotMessagesFromRest(
	raw: unknown,
	options?: MessageRestOptions,
): MessageSnapshot[] {
	const listOptions: Pick<MessageRestOptions, "isServer" | "autumnBase"> = {
		isServer: options?.isServer ?? true,
		autumnBase: options?.autumnBase ?? null,
	};
	if (!Array.isArray(raw)) {
		if (raw !== null && typeof raw === "object") {
			const record = raw as Record<string, unknown>;
			if (Array.isArray(record.messages)) {
				const usersById = usersMapFromRest(record.users, options);
				return orderMessagesChronological(
					snapshotMessageList(record.messages, usersById, listOptions),
				);
			}
		}
		return [];
	}
	return orderMessagesChronological(
		snapshotMessageList(raw, new Map(), listOptions),
	);
}

function snapshotMessageList(
	raw: readonly unknown[],
	usersById: ReadonlyMap<string, RestAuthorInfo>,
	options?: Pick<MessageRestOptions, "isServer" | "autumnBase">,
): MessageSnapshot[] {
	const messages: MessageSnapshot[] = [];
	for (const entry of raw) {
		const message = snapshotMessageFromRest(entry, usersById, options);
		if (message) {
			messages.push(message);
		}
	}
	return messages;
}

function usersMapFromRest(
	raw: unknown,
	options?: MessageRestOptions,
): Map<string, RestAuthorInfo> {
	const usersById = new Map<string, RestAuthorInfo>();
	if (!Array.isArray(raw)) {
		return usersById;
	}
	for (const entry of raw) {
		if (entry === null || typeof entry !== "object") {
			continue;
		}
		const record = entry as Record<string, unknown>;
		const id = asNonEmptyString(record._id);
		if (!id) {
			continue;
		}
		const name = displayNameForUser({
			displayName: asNonEmptyString(record.display_name),
			username: asNonEmptyString(record.username),
			userId: id,
		});
		const online = record.online === true;
		const presence = parsePresence(presenceFromRest(record.status), online);
		const avatarUrl =
			options !== undefined
				? avatarUrlFromRestFile(
						record.avatar,
						id,
						options.autumnBase,
						options.apiBase,
					)
				: null;
		usersById.set(id, {
			name,
			avatarUrl,
			presence,
		});
	}
	return usersById;
}

function presenceFromRest(status: unknown): string | undefined {
	if (status === null || typeof status !== "object") {
		return undefined;
	}
	const presence = (status as Record<string, unknown>).presence;
	return typeof presence === "string" ? presence : undefined;
}

function ulidTime(id: unknown): number {
	if (typeof id !== "string" || id.length < 10) {
		return 0;
	}
	try {
		const time = Number.parseInt(id.slice(0, 10), 32);
		return Number.isFinite(time) ? time : 0;
	} catch {
		return 0;
	}
}

export function orderMessagesChronological(
	messages: readonly MessageSnapshot[],
): MessageSnapshot[] {
	return [...messages].sort((left, right) => {
		if (left.createdAt !== right.createdAt) {
			return left.createdAt - right.createdAt;
		}
		return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
	});
}

export function mergeIncomingMessage(
	messages: readonly MessageSnapshot[],
	incoming: MessageSnapshot,
): MessageSnapshot[] {
	if (messages.some((message) => message.id === incoming.id)) {
		return orderMessagesChronological(messages);
	}
	return orderMessagesChronological([...messages, incoming]);
}

export function removeMessage(
	messages: readonly MessageSnapshot[],
	messageId: string,
): MessageSnapshot[] {
	return messages.filter((message) => message.id !== messageId);
}

export function buildSendPayload(content: string): { content: string } | null {
	const trimmed = content.trim();
	if (trimmed.length === 0) {
		return null;
	}
	return { content: trimmed };
}

/** Right-hand member pane: groups and server channels. DMs / notes hide it. */
export function showsMemberList(channel: ChannelSnapshot | null): boolean {
	if (!channel) {
		return false;
	}
	return (
		channel.type === "Group" ||
		channel.type === "TextChannel" ||
		channel.type === "VoiceChannel"
	);
}

export function composerPlaceholder(channel: ChannelSnapshot | null): string {
	if (!channel) {
		return "Message";
	}
	switch (channel.type) {
		case "DirectMessage":
			return `Message @${channel.name}`;
		case "SavedMessages":
			return "Save a note";
		case "Group":
			return `Message ${channel.name}`;
		case "TextChannel":
		case "VoiceChannel":
			return `Message #${channel.name}`;
	}
}
