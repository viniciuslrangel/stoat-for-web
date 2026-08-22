import { useMutation, useQuery } from "@tanstack/react-query";
import type { Client } from "stoat.js";

import { type BotId, parseBotId } from "@/domain/ids";
import { autumnBaseUrl } from "@/hooks/useShellLiveSync";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import { loadPersistedSession } from "@/lib/session-persist";
import { getStoatClient } from "@/lib/stoat-client";

export type BotDestination = {
	id: string;
	kind: "server" | "group";
	name: string;
};

export type BotPreview = {
	id: BotId;
	name: string;
	avatarUrl: string | null;
	description: string | null;
};

export type AddBotAction =
	| { kind: "login" }
	| {
			kind: "add";
			destinations: BotDestination[];
			pending: boolean;
			error?: string;
	  };

export type AddBotView =
	| { status: "loading" }
	| { status: "error"; heading: string; message: string }
	| { status: "ready"; bot: BotPreview; action: AddBotAction };

export class BotRequestError extends Error {
	readonly status: number;
	readonly type: string;
	readonly heading: string;

	constructor(status: number, body: unknown) {
		const copy = botErrorCopy(status, body);
		super(copy.message);
		this.name = "BotRequestError";
		this.status = status;
		this.type = copy.type;
		this.heading = copy.heading;
	}
}

export function botErrorCopy(
	status: number,
	body: unknown,
): { type: string; heading: string; message: string } {
	if (body instanceof TypeError && body.message === "Failed to fetch") {
		return {
			type: "Network",
			heading: "Couldn't load bot",
			message: "Could not reach the Stoat server.",
		};
	}
	const parsed = parseApiError(body);
	if (status === 404 || parsed.type === "NotFound") {
		return {
			type: "NotFound",
			heading: "Bot not found",
			message: "This bot invite is invalid or the bot is not public.",
		};
	}
	return {
		type: parsed.type,
		heading: "Couldn't load bot",
		message: parsed.message,
	};
}

export function parsePublicBot(
	raw: unknown,
	autumnBase: string | null,
): BotPreview {
	const record = asRecord(raw);
	if (!record) {
		throw new TypeError("Invalid bot response");
	}
	const name = asNonEmptyString(record.username);
	if (!name) {
		throw new TypeError("Invalid bot response");
	}
	const avatarId = asNonEmptyString(record.avatar);
	return {
		id: parseBotId(record._id),
		name,
		avatarUrl:
			avatarId && autumnBase
				? `${autumnBase.replace(/\/$/, "")}/avatars/${avatarId}`
				: null,
		description: asNonEmptyString(record.description),
	};
}

export function listBotDestinations(
	client: Client,
	botId: string,
): BotDestination[] {
	const destinations: BotDestination[] = [];
	for (const server of client.servers.toList()) {
		try {
			if (!server.havePermission("ManageServer")) {
				continue;
			}
			if (server.getMember(botId)) {
				continue;
			}
			destinations.push({
				id: server.id,
				kind: "server",
				name: server.name,
			});
		} catch {}
	}
	for (const channel of client.channels.toList()) {
		try {
			if (channel.type !== "Group") {
				continue;
			}
			if (channel.recipientIds.has(botId)) {
				continue;
			}
			destinations.push({
				id: channel.id,
				kind: "group",
				name: channel.name,
			});
		} catch {}
	}
	destinations.sort((left, right) => left.name.localeCompare(right.name));
	return destinations;
}

export async function loadBotPreview(code: string): Promise<{
	bot: BotPreview;
	destinations: BotDestination[];
}> {
	const client = getStoatClient();
	await client.initConfig();
	const body = await stoatRequest(`/bots/${encodeURIComponent(code)}/invite`);
	const bot = parsePublicBot(body, autumnBaseUrl(client));
	return {
		bot,
		destinations: listBotDestinations(client, bot.id),
	};
}

export async function addBotToDestination(input: {
	botId: BotId;
	destination: BotDestination;
}): Promise<BotDestination> {
	const body =
		input.destination.kind === "server"
			? { server: input.destination.id }
			: { group: input.destination.id };
	await stoatRequest(`/bots/${encodeURIComponent(input.botId)}/invite`, {
		method: "POST",
		body: JSON.stringify(body),
	});
	return input.destination;
}

export function addBotQueryKey(code: string, userId: string | null) {
	return ["bot-invite", code, userId] as const;
}

export function useAddBot(code: string): {
	view: AddBotView;
	add: (destination: BotDestination) => Promise<BotDestination | null>;
} {
	const userId = useSignedInUserId();
	let parsed: BotId | null = null;
	try {
		parsed = parseBotId(code);
	} catch {
		parsed = null;
	}

	const query = useQuery({
		queryKey: addBotQueryKey(code, userId),
		queryFn: () => loadBotPreview(code),
		enabled: parsed !== null,
		retry: (failureCount, error) => {
			if (error instanceof BotRequestError && error.status === 404) {
				return false;
			}
			return failureCount < 1;
		},
	});

	const addMutation = useMutation({
		mutationFn: addBotToDestination,
	});

	if (parsed === null) {
		const copy = botErrorCopy(404, { type: "NotFound" });
		return {
			view: { status: "error", heading: copy.heading, message: copy.message },
			add: async () => null,
		};
	}

	if (query.isError) {
		return {
			view: errorView(query.error),
			add: async () => null,
		};
	}

	if (!query.data) {
		return {
			view: { status: "loading" },
			add: async () => null,
		};
	}

	const { bot, destinations } = query.data;
	const action: AddBotAction = !userId
		? { kind: "login" }
		: {
				kind: "add",
				destinations,
				pending: addMutation.isPending,
				error: addMutation.error ? addMutation.error.message : undefined,
			};

	return {
		view: { status: "ready", bot, action },
		add: async (destination) => {
			if (action.kind !== "add") {
				return null;
			}
			return addMutation.mutateAsync({ botId: bot.id, destination });
		},
	};
}

function errorView(error: unknown): Extract<AddBotView, { status: "error" }> {
	if (error instanceof BotRequestError) {
		return {
			status: "error",
			heading: error.heading,
			message: error.message,
		};
	}
	const copy = botErrorCopy(0, error);
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
		throw new BotRequestError(0, error);
	}
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new BotRequestError(response.status, body);
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
