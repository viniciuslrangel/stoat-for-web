import { Client } from "stoat.js";

import { stoatApiBaseUrl } from "@/lib/env";

let client: Client | undefined;

type SessionCredentials = {
	_id: string;
	token: string;
	userId: string;
	timeoutMs?: number;
};

type EstablishResult = "websocket" | "rest";

let establishInFlight:
	| { key: string; promise: Promise<EstablishResult> }
	| undefined;

export function getStoatClient(): Client {
	if (!client) {
		client = new Client({
			baseURL: stoatApiBaseUrl(),
			autoReconnect: false,
			syncUnreads: true,
		});
	}
	return client;
}

export function resetStoatClient(): void {
	establishInFlight = undefined;
	if (client) {
		client.events.disconnect();
		client.removeAllListeners();
		client = undefined;
	}
}

function sessionKey(session: SessionCredentials): string {
	return `${session.userId}:${session._id}:${session.token}`;
}

function applyStoredClientSession(
	target: Client,
	session: SessionCredentials,
): void {
	target["useExistingSession"]({
		_id: session._id,
		token: session.token,
		user_id: session.userId,
	});
}

function alreadyReadyFor(target: Client, userId: string): boolean {
	try {
		return Boolean(target.ready()) && target.user?.id === userId;
	} catch {
		return false;
	}
}

async function establishSessionOnce(
	session: SessionCredentials,
): Promise<EstablishResult> {
	const next = getStoatClient();
	await next.initConfig();

	if (alreadyReadyFor(next, session.userId)) {
		return "websocket";
	}

	applyStoredClientSession(next, session);

	if (alreadyReadyFor(next, session.userId)) {
		return "websocket";
	}

	const timeoutMs = session.timeoutMs ?? 10_000;
	const ready = await waitForReady(next, timeoutMs);
	if (ready) {
		return "websocket";
	}

	const me = await next.api.get("/users/@me");
	if (typeof me._id !== "string" || me._id.length === 0) {
		throw new Error("Could not verify the session with /users/@me");
	}
	return "rest";
}

/**
 * Connect and wait for Ready. Concurrent calls for the same session share one
 * handshake. A second connect() aborts the first socket and drops Ready in
 * Disconnected state (React Strict Mode remounts useSessionLifecycle).
 */
export async function establishSession(
	session: SessionCredentials,
): Promise<EstablishResult> {
	const key = sessionKey(session);
	if (establishInFlight?.key === key) {
		return establishInFlight.promise;
	}

	const promise = establishSessionOnce(session).finally(() => {
		if (establishInFlight?.promise === promise) {
			establishInFlight = undefined;
		}
	});
	establishInFlight = { key, promise };
	return promise;
}

function waitForReady(target: Client, timeoutMs: number): Promise<boolean> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			target.removeListener("ready", onReady);
			resolve(false);
		}, timeoutMs);

		function onReady(): void {
			clearTimeout(timer);
			resolve(true);
		}

		target.once("ready", onReady);
		target.connect();
	});
}
