import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { Channel, Message } from "stoat.js";

import type { Presence } from "@/domain/presence";
import {
	buildSendPayload,
	type MessageAttachmentSnapshot,
	type MessageSnapshot,
	mergeIncomingMessage,
	orderMessagesChronological,
	removeMessage,
	snapshotMessage,
	snapshotMessagesFromRest,
} from "@/hooks/chat-snapshots";
import { displayNameFromSdk } from "@/hooks/useChannelMembers";
import { autumnBaseUrl } from "@/hooks/useShellLiveSync";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { userAvatarUrlFromSdk, withAutumnOriginal } from "@/lib/avatar-url";
import { isUnresolvedDisplayName } from "@/lib/display-name";
import { getStoatClient } from "@/lib/stoat-client";
import {
	collectSystemUserIds,
	parseSystemMessage,
	type SystemMessageData,
} from "@/lib/system-message";

export function messagesQueryKey(userId: string, channelId: string) {
	return ["chat", userId, "messages", channelId] as const;
}

function snapshotAttachmentsFromSdk(
	message: Message,
): MessageAttachmentSnapshot[] {
	let files: Message["attachments"];
	try {
		files = message.attachments;
	} catch {
		return [];
	}
	if (!files || files.length === 0) {
		return [];
	}
	const out: MessageAttachmentSnapshot[] = [];
	for (const file of files) {
		try {
			const metaType =
				file.metadata &&
				typeof file.metadata === "object" &&
				"type" in file.metadata
					? String(file.metadata.type)
					: null;
			const contentType =
				typeof file.contentType === "string" ? file.contentType : null;
			const kind: MessageAttachmentSnapshot["kind"] =
				metaType === "Image" || contentType?.toLowerCase().startsWith("image/")
					? "image"
					: "file";
			let url: string | undefined;
			try {
				url =
					kind === "image" ? file.createFileURL(true) : file.createFileURL();
			} catch {
				url = undefined;
			}
			if (!url) {
				try {
					url = file.originalUrl;
				} catch {
					url = undefined;
				}
			}
			if (!url) {
				try {
					url = file.previewUrl;
				} catch {
					url = undefined;
				}
			}
			if (typeof url !== "string" || url.length === 0) {
				continue;
			}
			out.push({
				id: file.id,
				url,
				filename:
					typeof file.filename === "string" && file.filename.length > 0
						? file.filename
						: null,
				contentType,
				kind,
			});
		} catch {
			/* incomplete hydrate */
		}
	}
	return out;
}

/**
 * GIF-safe author avatar URL. Prefer animatedAvatarURL / userAvatarUrlFromSdk.
 * Never return a plain Autumn `/{tag}/{id}` GIF URL (static webp freeze).
 */
export function readMessageAvatarUrl(message: Message): string | null {
	try {
		const animated = message.animatedAvatarURL;
		if (typeof animated === "string" && animated.length > 0) {
			return animated;
		}
	} catch {
		/* incomplete hydrate */
	}
	try {
		const author = message.author;
		if (author) {
			const fromUser = userAvatarUrlFromSdk(author);
			if (fromUser) {
				return fromUser;
			}
		}
	} catch {
		/* ignore */
	}
	try {
		const member = message.member;
		if (member) {
			const fromMember = userAvatarUrlFromSdk(member);
			if (fromMember) {
				return fromMember;
			}
		}
	} catch {
		/* ignore */
	}
	try {
		const staticUrl = message.avatarURL;
		if (typeof staticUrl !== "string" || staticUrl.length === 0) {
			return null;
		}
		let contentType: string | null = null;
		try {
			contentType = message.author?.avatar?.contentType ?? null;
		} catch {
			contentType = null;
		}
		return withAutumnOriginal(staticUrl, { contentType });
	} catch {
		return null;
	}
}

function readAuthorPresence(message: Message): Presence | null {
	try {
		const author = message.author;
		if (!author) {
			return null;
		}
		const presence = author.presence;
		if (
			presence === "Online" ||
			presence === "Idle" ||
			presence === "Focus" ||
			presence === "Busy" ||
			presence === "Invisible"
		) {
			return presence;
		}
	} catch {
		/* ignore */
	}
	return null;
}

/**
 * Masquerade / webhook keep SDK `message.username`.
 * Otherwise nickname → display name → username → short id.
 */
export function resolveMessageAuthorName(message: Message): string {
	try {
		if (message.masquerade?.name) {
			const name = message.username;
			if (typeof name === "string" && name.trim().length > 0) {
				return name.trim();
			}
		}
	} catch {
		/* incomplete */
	}
	try {
		if (message.webhook) {
			const name = message.username;
			if (typeof name === "string" && name.trim().length > 0) {
				return name.trim();
			}
		}
	} catch {
		/* incomplete */
	}

	let member: Message["member"];
	try {
		member = message.member;
	} catch {
		member = undefined;
	}
	let author: Message["author"];
	try {
		author = message.author;
	} catch {
		author = undefined;
	}
	return displayNameFromSdk(author, member);
}

export function snapshotMessageFromSdk(
	message: Message,
	options: { isServer?: boolean } = {},
): MessageSnapshot | null {
	const authorName = resolveMessageAuthorName(message);
	let createdAt = 0;
	try {
		createdAt = message.createdAt.getTime();
	} catch {
		createdAt = 0;
	}
	const isServer = options.isServer ?? true;
	const system = snapshotSystemFromSdk(message, isServer);
	let serverId: string | undefined;
	try {
		serverId = message.channel?.serverId || undefined;
	} catch {
		serverId = undefined;
	}
	const systemNames = resolveSystemNamesFromSdk(system, serverId);
	return snapshotMessage({
		id: message.id,
		authorId: message.authorId,
		authorName,
		authorAvatarUrl: readMessageAvatarUrl(message) ?? undefined,
		authorPresence: readAuthorPresence(message) ?? undefined,
		content: message.content ?? "",
		attachments: snapshotAttachmentsFromSdk(message),
		system,
		systemNames,
		createdAt,
	});
}

function channelIsServer(channel: Channel | undefined): boolean {
	if (!channel) {
		return true;
	}
	try {
		const type: string = channel.type;
		return type === "TextChannel" || type === "VoiceChannel";
	} catch {
		return true;
	}
}

function snapshotSystemFromSdk(
	message: Message,
	isServer: boolean,
): SystemMessageData | null {
	let systemMessage: Message["systemMessage"];
	try {
		systemMessage = message.systemMessage;
	} catch {
		return null;
	}
	if (!systemMessage) {
		return null;
	}

	const type = systemMessage.type;
	switch (type) {
		case "text": {
			const content =
				"content" in systemMessage && typeof systemMessage.content === "string"
					? systemMessage.content
					: "";
			return { type: "text", content };
		}
		case "user_added":
		case "user_remove": {
			const userId =
				"userId" in systemMessage && typeof systemMessage.userId === "string"
					? systemMessage.userId
					: null;
			const byId =
				"byId" in systemMessage && typeof systemMessage.byId === "string"
					? systemMessage.byId
					: null;
			if (!userId || !byId) {
				return null;
			}
			return { type, userId, byId };
		}
		case "user_joined":
		case "user_kicked":
		case "user_banned": {
			const userId =
				"userId" in systemMessage && typeof systemMessage.userId === "string"
					? systemMessage.userId
					: null;
			if (!userId) {
				return null;
			}
			return { type, userId };
		}
		case "user_left": {
			const userId =
				"userId" in systemMessage && typeof systemMessage.userId === "string"
					? systemMessage.userId
					: null;
			if (!userId) {
				return null;
			}
			return {
				type: "user_left",
				userId,
				scope: isServer ? "server" : "group",
			};
		}
		case "channel_renamed": {
			const byId =
				"byId" in systemMessage && typeof systemMessage.byId === "string"
					? systemMessage.byId
					: null;
			const name =
				"name" in systemMessage && typeof systemMessage.name === "string"
					? systemMessage.name
					: null;
			if (!byId || !name) {
				return null;
			}
			return { type: "channel_renamed", byId, name };
		}
		case "channel_description_changed":
		case "channel_icon_changed": {
			const byId =
				"byId" in systemMessage && typeof systemMessage.byId === "string"
					? systemMessage.byId
					: null;
			if (!byId) {
				return null;
			}
			return { type, byId };
		}
		case "channel_ownership_changed": {
			const fromId =
				"fromId" in systemMessage && typeof systemMessage.fromId === "string"
					? systemMessage.fromId
					: null;
			const toId =
				"toId" in systemMessage && typeof systemMessage.toId === "string"
					? systemMessage.toId
					: null;
			if (!fromId || !toId) {
				return null;
			}
			return { type: "channel_ownership_changed", fromId, toId };
		}
		case "message_pinned":
		case "message_unpinned": {
			const byId =
				"byId" in systemMessage && typeof systemMessage.byId === "string"
					? systemMessage.byId
					: null;
			const messageId =
				"messageId" in systemMessage &&
				typeof systemMessage.messageId === "string"
					? systemMessage.messageId
					: null;
			if (!byId || !messageId) {
				return null;
			}
			return { type, byId, messageId };
		}
		case "call_started": {
			const byId =
				"byId" in systemMessage && typeof systemMessage.byId === "string"
					? systemMessage.byId
					: null;
			if (!byId) {
				return null;
			}
			let startedAt = 0;
			try {
				if (
					"startedAt" in systemMessage &&
					systemMessage.startedAt instanceof Date
				) {
					startedAt = systemMessage.startedAt.getTime();
				}
			} catch {
				startedAt = 0;
			}
			let finishedAt: number | null = null;
			try {
				if (
					"finishedAt" in systemMessage &&
					systemMessage.finishedAt instanceof Date
				) {
					finishedAt = systemMessage.finishedAt.getTime();
				}
			} catch {
				finishedAt = null;
			}
			return { type: "call_started", byId, startedAt, finishedAt };
		}
		default:
			return parseSystemMessage({ type }, { isServer });
	}
}

function resolveSystemNamesFromSdk(
	system: SystemMessageData | null,
	serverId?: string,
): Record<string, string> {
	if (!system) {
		return {};
	}
	const names: Record<string, string> = {};
	const client = getStoatClient();
	for (const userId of collectSystemUserIds(system)) {
		try {
			const user = client.users.get(userId);
			const member =
				serverId !== undefined
					? client.serverMembers.getByKey({
							server: serverId,
							user: userId,
						})
					: undefined;
			const label = displayNameFromSdk(user, member);
			if (!isUnresolvedDisplayName(label, userId)) {
				names[userId] = label;
			}
		} catch {
			/* leave unresolved — MessageList fills from shared member map */
		}
	}
	return names;
}

export async function loadMessages(
	channelId: string,
): Promise<MessageSnapshot[]> {
	const client = getStoatClient();
	try {
		const channel =
			client.channels.get(channelId) ??
			(await client.channels.fetch(channelId));
		const isServer = channelIsServer(channel);
		// Solid uses fetchMessagesWithUsers so authors hydrate into client.users.
		const { messages: fetched } = await channel.fetchMessagesWithUsers({
			limit: 50,
		});
		const messages: MessageSnapshot[] = [];
		for (const message of fetched) {
			const snapshot = snapshotMessageFromSdk(message, { isServer });
			if (snapshot) {
				messages.push(snapshot);
			}
		}
		return orderMessagesChronological(messages);
	} catch {
		try {
			const channel = client.channels.get(channelId);
			const isServer = channelIsServer(channel);
			const raw = await client.api.get(
				`/channels/${channelId as ""}/messages`,
				{
					limit: 50,
					include_users: true,
				},
			);
			return snapshotMessagesFromRest(raw, {
				autumnBase: autumnBaseUrl(client),
				apiBase: client.options.baseURL,
				isServer,
			});
		} catch {
			return [];
		}
	}
}

export async function sendChannelMessage(input: {
	channelId: string;
	content: string;
}): Promise<MessageSnapshot> {
	const payload = buildSendPayload(input.content);
	if (!payload) {
		throw new Error("Message is empty");
	}
	const client = getStoatClient();
	const channel =
		client.channels.get(input.channelId) ??
		(await client.channels.fetch(input.channelId));
	const sent = await channel.sendMessage(payload.content);
	const snapshot = snapshotMessageFromSdk(sent);
	if (!snapshot) {
		throw new Error("Sent message was unreadable");
	}
	return snapshot;
}

export function useMessages(channelId: string | undefined): {
	messages: MessageSnapshot[];
	loading: boolean;
} {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const enabled = userId !== null && typeof channelId === "string";
	const queryKey =
		userId && channelId
			? messagesQueryKey(userId, channelId)
			: (["chat", "anonymous", "messages"] as const);

	const query = useQuery({
		queryKey,
		queryFn: () => loadMessages(channelId ?? ""),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	const writeCache = useCallback(
		(updater: (current: MessageSnapshot[]) => MessageSnapshot[]) => {
			if (!userId || !channelId) {
				return;
			}
			queryClient.setQueryData(
				messagesQueryKey(userId, channelId),
				(current: MessageSnapshot[] | undefined) => updater(current ?? []),
			);
		},
		[channelId, queryClient, userId],
	);

	useEffect(() => {
		if (!enabled || !channelId) {
			return;
		}
		const client = getStoatClient();
		const isServer = channelIsServer(client.channels.get(channelId));

		function onCreate(message: Message): void {
			if (message.channelId !== channelId) {
				return;
			}
			const snapshot = snapshotMessageFromSdk(message, { isServer });
			if (!snapshot) {
				return;
			}
			writeCache((current) => mergeIncomingMessage(current, snapshot));
		}

		function onDelete(message: { id: string; channelId?: string }): void {
			if (message.channelId && message.channelId !== channelId) {
				return;
			}
			writeCache((current) => removeMessage(current, message.id));
		}

		client.addListener("messageCreate", onCreate);
		client.addListener("messageDelete", onDelete);
		return () => {
			client.removeListener("messageCreate", onCreate);
			client.removeListener("messageDelete", onDelete);
		};
	}, [channelId, enabled, writeCache]);

	return {
		messages: query.data ?? [],
		loading: query.isPending && enabled,
	};
}

export function useSendMessage(channelId: string | undefined): {
	send: (content: string) => Promise<void>;
	pending: boolean;
} {
	const userId = useSignedInUserId();
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (content: string) => {
			if (!channelId) {
				throw new Error("No channel");
			}
			return sendChannelMessage({ channelId, content });
		},
		onSuccess: (snapshot) => {
			if (!userId || !channelId) {
				return;
			}
			queryClient.setQueryData(
				messagesQueryKey(userId, channelId),
				(current: MessageSnapshot[] | undefined) =>
					mergeIncomingMessage(current ?? [], snapshot),
			);
		},
	});

	return {
		send: async (content: string) => {
			await mutation.mutateAsync(content);
		},
		pending: mutation.isPending,
	};
}
