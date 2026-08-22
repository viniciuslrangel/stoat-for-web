import { afterEach, describe, expect, it } from "vite-plus/test";

import { parseSessionId, parseUserId } from "@/domain/ids";
import {
	clearPersistedSession,
	loadPersistedSession,
	markPersistedSessionValid,
	parsePersistedSession,
	SESSION_STORAGE_KEY,
	savePersistedSession,
	sessionToRestore,
} from "./session-persist";

function memoryStorage(initial: Record<string, string> = {}) {
	const map = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		},
		removeItem: (key: string) => {
			map.delete(key);
		},
		dump: () => Object.fromEntries(map),
	};
}

const validSession = {
	_id: parseSessionId("01SESSION"),
	token: "tok_abc",
	userId: parseUserId("01USER"),
	valid: true,
};

describe("parsePersistedSession", () => {
	it("parses a complete session", () => {
		expect(parsePersistedSession(validSession)).toEqual(validSession);
	});

	it("rejects missing token or ids", () => {
		expect(parsePersistedSession({ ...validSession, token: "" })).toBeNull();
		expect(parsePersistedSession({ ...validSession, _id: "" })).toBeNull();
		expect(parsePersistedSession({ ...validSession, userId: " x" })).toBeNull();
	});

	it("rejects non-boolean valid", () => {
		expect(
			parsePersistedSession({ ...validSession, valid: "true" }),
		).toBeNull();
	});
});

describe("sessionToRestore", () => {
	it("keeps only valid:true sessions", () => {
		expect(sessionToRestore({ ...validSession, valid: true })).toEqual(
			validSession,
		);
		expect(sessionToRestore({ ...validSession, valid: false })).toBeNull();
		expect(sessionToRestore(null)).toBeNull();
	});
});

describe("persisted session storage", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("does not restore a valid:false session", () => {
		const storage = memoryStorage();
		savePersistedSession({ ...validSession, valid: false }, storage);
		expect(loadPersistedSession(storage)).toBeNull();
	});

	it("restores a valid:true session", () => {
		const storage = memoryStorage();
		savePersistedSession(validSession, storage);
		expect(loadPersistedSession(storage)).toEqual(validSession);
	});

	it("marks a provisional session valid", () => {
		savePersistedSession({ ...validSession, valid: false });
		expect(loadPersistedSession()).toBeNull();
		expect(markPersistedSessionValid()).toEqual(validSession);
		expect(loadPersistedSession()).toEqual(validSession);
	});

	it("clears the stored session", () => {
		savePersistedSession(validSession);
		clearPersistedSession();
		expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});
});
