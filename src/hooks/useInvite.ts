import { useMutation, useQuery } from "@tanstack/react-query";

import {
	type ChannelId,
	type InviteCode,
	parseChannelId,
	parseInviteCode,
	parseServerId,
	type ServerId,
} from "@/domain/ids";
import { autumnBaseUrl } from "@/hooks/useShellLiveSync";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import { loadPersistedSession } from "@/lib/session-persist";
import { getStoatClient } from "@/lib/stoat-client";

export type InviteDestination =
	| { kind: "server"; id: ServerId }
	| { kind: "group"; id: ChannelId };

export type InvitePreview = {
	code: InviteCode;
	name: string;
	iconUrl: string | null;
	bannerUrl: string | null;
	memberCount: number | null;
	inviterName: string | null;
	alreadyMember: boolean;
	destination: InviteDestination;
};

export type InviteAction =
	| { kind: "login" }
	| { kind: "open" }
	| { kind: "join"; pending: boolean; error?: string };

export type InviteView =
	| { status: "loading" }
	| { status: "error"; heading: string; message: string }
	| { status: "ready"; invite: InvitePreview; action: InviteAction };

export class InviteRequestError extends Error {
	readonly status: number;
	readonly type: string;
	readonly heading: string;

	constructor(status: number, body: unknown) {
		const copy = inviteErrorCopy(status, body);
		super(copy.message);
		this.name = "InviteRequestError";
		this.status = status;
		this.type = copy.type;
		this.heading = copy.heading;
	}
}

export function inviteErrorCopy(
	status: number,
	body: unknown,
): { type: string; heading: string; message: string } {
	if (body instanceof TypeError && body.message === "Failed to fetch") {
		return {
			type: "Network",
			heading: "Couldn't load invite",
			message: "Could not reach the Stoat server.",
		};
	}
	const parsed = parseApiError(body);
	if (status === 404 || parsed.type === "NotFound") {
		return {
			type: "NotFound",
			heading: "Invite invalid",
			message:
				"This invite may be expired, or you might not have permission to join.",
		};
	}
	return {
		type: parsed.type,
		heading: "Couldn't load invite",
		message: parsed.message,
	};
}

export function parseInviteResponse(
	raw: unknown,
	options: {
		autumnBase: string | null;
		isMember: (id: string) => boolean;
	},
): InvitePreview {
	const record = asRecord(raw);
	if (!record) {
		throw new TypeError("Invalid invite response");
	}
	const code = parseInviteCode(record.code);
	const inviterName = asNonEmptyString(record.user_name);
	if (record.type === "Server") {
		const name = asNonEmptyString(record.server_name);
		if (!name) {
			throw new TypeError("Invalid invite response");
		}
		const serverId = parseServerId(record.server_id);
		const memberCount =
			typeof record.member_count === "number" &&
			Number.isFinite(record.member_count)
				? record.member_count
				: null;
		return {
			code,
			name,
			iconUrl: attachmentUrl(options.autumnBase, record.server_icon),
			bannerUrl: attachmentUrl(options.autumnBase, record.server_banner),
			memberCount,
			inviterName,
			alreadyMember: options.isMember(serverId),
			destination: { kind: "server", id: serverId },
		};
	}
	if (record.type === "Group") {
		const name = asNonEmptyString(record.channel_name);
		if (!name) {
			throw new TypeError("Invalid invite response");
		}
		const channelId = parseChannelId(record.channel_id);
		return {
			code,
			name,
			iconUrl: attachmentUrl(options.autumnBase, record.user_avatar),
			bannerUrl: null,
			memberCount: null,
			inviterName,
			alreadyMember: options.isMember(channelId),
			destination: { kind: "group", id: channelId },
		};
	}
	throw new TypeError("Invalid invite response");
}

export function parseInviteJoin(raw: unknown): InviteDestination {
	const record = asRecord(raw);
	if (!record) {
		throw new TypeError("Invalid invite join response");
	}
	if (record.type === "Server") {
		const server = asRecord(record.server);
		if (!server) {
			throw new TypeError("Invalid invite join response");
		}
		return { kind: "server", id: parseServerId(server._id) };
	}
	if (record.type === "Group") {
		const channel = asRecord(record.channel);
		if (!channel) {
			throw new TypeError("Invalid invite join response");
		}
		return { kind: "group", id: parseChannelId(channel._id) };
	}
	throw new TypeError("Invalid invite join response");
}

export async function loadInvitePreview(code: string): Promise<InvitePreview> {
	const client = getStoatClient();
	await client.initConfig();
	const body = await stoatRequest(`/invites/${encodeURIComponent(code)}`);
	return parseInviteResponse(body, {
		autumnBase: autumnBaseUrl(client),
		isMember: (id) => client.servers.has(id) || client.channels.has(id),
	});
}

export async function joinInvite(code: InviteCode): Promise<InviteDestination> {
	const body = await stoatRequest(`/invites/${encodeURIComponent(code)}`, {
		method: "POST",
	});
	return parseInviteJoin(body);
}

export function inviteQueryKey(code: string, userId: string | null) {
	return ["invite", code, userId] as const;
}

export function useInvite(code: string): {
	view: InviteView;
	accept: () => Promise<InviteDestination | null>;
} {
	const userId = useSignedInUserId();
	let parsed: InviteCode | null = null;
	try {
		parsed = parseInviteCode(code);
	} catch {
		parsed = null;
	}

	const query = useQuery({
		queryKey: inviteQueryKey(code, userId),
		queryFn: () => loadInvitePreview(code),
		enabled: parsed !== null,
		retry: (failureCount, error) => {
			if (error instanceof InviteRequestError && error.status === 404) {
				return false;
			}
			return failureCount < 1;
		},
	});

	const acceptMutation = useMutation({
		mutationFn: (inviteCode: InviteCode) => joinInvite(inviteCode),
	});

	if (parsed === null) {
		const copy = inviteErrorCopy(404, { type: "NotFound" });
		return {
			view: { status: "error", heading: copy.heading, message: copy.message },
			accept: async () => null,
		};
	}

	if (query.isError) {
		return {
			view: errorView(query.error),
			accept: async () => null,
		};
	}

	if (!query.data) {
		return {
			view: { status: "loading" },
			accept: async () => null,
		};
	}

	const invite = query.data;
	const action: InviteAction = !userId
		? { kind: "login" }
		: invite.alreadyMember
			? { kind: "open" }
			: {
					kind: "join",
					pending: acceptMutation.isPending,
					error: acceptMutation.error
						? acceptMutation.error.message
						: undefined,
				};

	return {
		view: { status: "ready", invite, action },
		accept: async () => {
			if (action.kind !== "join") {
				return invite.destination;
			}
			return acceptMutation.mutateAsync(invite.code);
		},
	};
}

function errorView(error: unknown): Extract<InviteView, { status: "error" }> {
	if (error instanceof InviteRequestError) {
		return {
			status: "error",
			heading: error.heading,
			message: error.message,
		};
	}
	const copy = inviteErrorCopy(0, error);
	return { status: "error", heading: copy.heading, message: copy.message };
}

async function stoatRequest(
	path: string,
	init?: RequestInit,
): Promise<unknown> {
	const headers = new Headers(init?.headers);
	if (init?.method && init.method !== "GET") {
		headers.set("Content-Type", "application/json");
	}
	const token = loadPersistedSession()?.token;
	if (token && !headers.has("X-Session-Token")) {
		headers.set("X-Session-Token", token);
	}
	let response: Response;
	try {
		response = await fetch(`${stoatApiBaseUrl()}${path}`, {
			...init,
			headers,
		});
	} catch (error) {
		throw new InviteRequestError(0, error);
	}
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new InviteRequestError(response.status, body);
	}
	return body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (value === null || typeof value !== "object") {
		return null;
	}
	return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function attachmentUrl(
	autumnBase: string | null,
	file: unknown,
): string | null {
	const record = asRecord(file);
	if (!record || !autumnBase) {
		return null;
	}
	const id = asNonEmptyString(record._id);
	const tag = asNonEmptyString(record.tag);
	if (!id || !tag) {
		return null;
	}
	return `${autumnBase.replace(/\/$/, "")}/${tag}/${id}`;
}
