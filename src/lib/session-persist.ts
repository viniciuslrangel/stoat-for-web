import {
	parseSessionId,
	parseUserId,
	type SessionId,
	type UserId,
} from "@/domain/ids";

export const SESSION_STORAGE_KEY = "stoat.session.v1";

export type PersistedSession = {
	_id: SessionId;
	token: string;
	userId: UserId;
	valid: boolean;
};

export function parsePersistedSession(raw: unknown): PersistedSession | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	if (typeof record.token !== "string" || record.token.length === 0) {
		return null;
	}
	if (typeof record.valid !== "boolean") {
		return null;
	}
	try {
		return {
			_id: parseSessionId(record._id),
			token: record.token,
			userId: parseUserId(record.userId),
			valid: record.valid,
		};
	} catch {
		return null;
	}
}

export function sessionToRestore(
	session: PersistedSession | null,
): PersistedSession | null {
	if (!session || session.valid !== true) {
		return null;
	}
	return session;
}

export function loadPersistedSession(
	storage: Pick<Storage, "getItem"> = localStorage,
): PersistedSession | null {
	const raw = storage.getItem(SESSION_STORAGE_KEY);
	if (!raw) {
		return null;
	}
	try {
		return sessionToRestore(parsePersistedSession(JSON.parse(raw) as unknown));
	} catch {
		return null;
	}
}

export function savePersistedSession(
	session: PersistedSession,
	storage: Pick<Storage, "setItem"> = localStorage,
): void {
	storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function markPersistedSessionValid(
	storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): PersistedSession | null {
	const raw = storage.getItem(SESSION_STORAGE_KEY);
	if (!raw) {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
	const session = parsePersistedSession(parsed);
	if (!session) {
		return null;
	}
	if (session.valid) {
		return session;
	}
	const next = { ...session, valid: true };
	savePersistedSession(next, storage);
	return next;
}

export function clearPersistedSession(
	storage: Pick<Storage, "removeItem"> = localStorage,
): void {
	storage.removeItem(SESSION_STORAGE_KEY);
}
