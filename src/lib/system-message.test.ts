import { describe, expect, it } from "vite-plus/test";

import {
	formatSystemMessage,
	parseSystemMessage,
	shortUserLabel,
} from "./system-message";

const names: Record<string, string> = {
	"01ALICE": "Alice",
	"01BOB": "Bob",
	"01CAROL": "Carol",
};

function resolve(id: string): string {
	return names[id] ?? shortUserLabel(id);
}

describe("parseSystemMessage", () => {
	it("parses user_joined", () => {
		expect(parseSystemMessage({ type: "user_joined", id: "01ALICE" })).toEqual({
			type: "user_joined",
			userId: "01ALICE",
		});
	});

	it("scopes user_left by channel kind", () => {
		expect(
			parseSystemMessage(
				{ type: "user_left", id: "01ALICE" },
				{ isServer: true },
			),
		).toEqual({ type: "user_left", userId: "01ALICE", scope: "server" });
		expect(
			parseSystemMessage(
				{ type: "user_left", id: "01ALICE" },
				{ isServer: false },
			),
		).toEqual({ type: "user_left", userId: "01ALICE", scope: "group" });
	});
});

describe("formatSystemMessage", () => {
	it("formats user_added", () => {
		expect(
			formatSystemMessage(
				{ type: "user_added", userId: "01ALICE", byId: "01BOB" },
				resolve,
			),
		).toBe("Alice has been added by Bob");
	});

	it("formats user_remove", () => {
		expect(
			formatSystemMessage(
				{ type: "user_remove", userId: "01ALICE", byId: "01BOB" },
				resolve,
			),
		).toBe("Alice has been removed by Bob");
	});

	it("formats user_joined", () => {
		expect(
			formatSystemMessage({ type: "user_joined", userId: "01ALICE" }, resolve),
		).toBe("Alice joined the server");
	});

	it("formats user_left for server and group", () => {
		expect(
			formatSystemMessage(
				{ type: "user_left", userId: "01ALICE", scope: "server" },
				resolve,
			),
		).toBe("Alice left the server");
		expect(
			formatSystemMessage(
				{ type: "user_left", userId: "01ALICE", scope: "group" },
				resolve,
			),
		).toBe("Alice left the group");
	});

	it("formats user_kicked", () => {
		expect(
			formatSystemMessage({ type: "user_kicked", userId: "01ALICE" }, resolve),
		).toBe("Alice has been kicked from the server");
	});

	it("formats user_banned", () => {
		expect(
			formatSystemMessage({ type: "user_banned", userId: "01ALICE" }, resolve),
		).toBe("Alice has been banned from the server");
	});

	it("formats channel_renamed", () => {
		expect(
			formatSystemMessage(
				{ type: "channel_renamed", name: "lounge", byId: "01BOB" },
				resolve,
			),
		).toBe("Bob updated the channel name to lounge");
	});

	it("formats channel_description_changed", () => {
		expect(
			formatSystemMessage(
				{ type: "channel_description_changed", byId: "01BOB" },
				resolve,
			),
		).toBe("Bob updated the channel description");
	});

	it("formats channel_icon_changed", () => {
		expect(
			formatSystemMessage(
				{ type: "channel_icon_changed", byId: "01BOB" },
				resolve,
			),
		).toBe("Bob updated the channel icon");
	});

	it("formats channel_ownership_changed", () => {
		expect(
			formatSystemMessage(
				{
					type: "channel_ownership_changed",
					fromId: "01BOB",
					toId: "01CAROL",
				},
				resolve,
			),
		).toBe("Bob transferred ownership to Carol");
	});

	it("formats message_pinned and message_unpinned", () => {
		expect(
			formatSystemMessage(
				{ type: "message_pinned", messageId: "01MSG", byId: "01BOB" },
				resolve,
			),
		).toBe("Bob pinned a message");
		expect(
			formatSystemMessage(
				{ type: "message_unpinned", messageId: "01MSG", byId: "01BOB" },
				resolve,
			),
		).toBe("Bob unpinned a message");
	});

	it("formats call_started with and without duration", () => {
		expect(
			formatSystemMessage(
				{
					type: "call_started",
					byId: "01ALICE",
					startedAt: 1_000,
					finishedAt: null,
				},
				resolve,
			),
		).toBe("Alice started a call");
		expect(
			formatSystemMessage(
				{
					type: "call_started",
					byId: "01ALICE",
					startedAt: 1_000,
					finishedAt: 61_000,
				},
				resolve,
			),
		).toBe("Alice started a call that lasted 1m");
	});

	it("formats text system messages", () => {
		expect(
			formatSystemMessage({ type: "text", content: "Server notice" }, resolve),
		).toBe("Server notice");
	});

	it("falls back to short id when name is missing", () => {
		expect(
			formatSystemMessage(
				{ type: "user_joined", userId: "01UNKNOWNUSERIDLONG" },
				shortUserLabel,
			),
		).toBe("01UNKNOW joined the server");
	});
});
