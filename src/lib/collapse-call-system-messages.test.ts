import { describe, expect, it } from "vite-plus/test";

import {
	CALL_COLLAPSE_WINDOW_MS,
	collapseCallSystemMessages,
} from "./collapse-call-system-messages";
import type { SystemMessageData } from "./system-message";

const HOUR = CALL_COLLAPSE_WINDOW_MS;
const MINUTE = 60_000;

function call(
	id: string,
	createdAt: number,
	byId = "01USER",
	durationMs = 31 * MINUTE,
): {
	id: string;
	createdAt: number;
	system: SystemMessageData;
} {
	return {
		id,
		createdAt,
		system: {
			type: "call_started",
			byId,
			startedAt: createdAt - durationMs,
			finishedAt: createdAt,
		},
	};
}

function text(id: string, createdAt: number) {
	return {
		id,
		createdAt,
		system: null as SystemMessageData | null,
	};
}

function pin(id: string, createdAt: number) {
	return {
		id,
		createdAt,
		system: {
			type: "message_pinned" as const,
			messageId: "01MSG",
			byId: "01USER",
		},
	};
}

describe("collapseCallSystemMessages", () => {
	it("keeps only the last of two calls 31m apart", () => {
		const t0 = 1_000_000;
		const messages = [
			call("a", t0, "01USER", 31 * MINUTE),
			call("b", t0 + 31 * MINUTE, "01USER", 43 * MINUTE),
		];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["b"]);
	});

	it("keeps both calls when 61m apart", () => {
		const t0 = 1_000_000;
		const messages = [call("a", t0), call("b", t0 + HOUR + MINUTE)];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["a", "b"]);
	});

	it("does not merge call then text then call", () => {
		const t0 = 1_000_000;
		const messages = [
			call("a", t0),
			text("t", t0 + 5 * MINUTE),
			call("b", t0 + 10 * MINUTE),
		];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["a", "t", "b"]);
	});

	it("does not merge across non-call system messages", () => {
		const t0 = 1_000_000;
		const messages = [
			call("a", t0),
			pin("p", t0 + 5 * MINUTE),
			call("b", t0 + 10 * MINUTE),
		];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["a", "p", "b"]);
	});

	it("collapses a transitive adjacent chain under 1h gaps", () => {
		const t0 = 1_000_000;
		const messages = [
			call("a", t0),
			call("b", t0 + 20 * MINUTE),
			call("c", t0 + 40 * MINUTE),
		];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["c"]);
	});

	it("does not collapse different initiators even when adjacent", () => {
		const t0 = 1_000_000;
		const messages = [
			call("a", t0, "01ALICE"),
			call("b", t0 + 10 * MINUTE, "01BOB"),
		];
		const visible = collapseCallSystemMessages(messages);
		expect(visible.map((m) => m.id)).toEqual(["a", "b"]);
	});

	it("leaves ordinary chat untouched", () => {
		const messages = [text("1", 1), text("2", 2)];
		expect(collapseCallSystemMessages(messages)).toEqual(messages);
	});
});
