import { describe, expect, it } from "vite-plus/test";

import {
	mergeUserNameLookups,
	resolveUserMention,
	tokenizeMentions,
	usersByIdFromMessages,
} from "@/lib/mentions";

const USER = "01M0DJ5Q6KX1BAJTTGKXHNPGV7";
const CHANNEL = "01M0J8S8MC2K5BQVNH73HXCTAM";
const ROLE = "01ABCDEFGHJKMNPQRSTVWXYZ01";

describe("tokenizeMentions", () => {
	it("returns a single text token when there are no mentions", () => {
		expect(tokenizeMentions("hello world")).toEqual([
			{ type: "text", value: "hello world" },
		]);
	});

	it("parses a user mention", () => {
		expect(tokenizeMentions(`hi <@${USER}>`)).toEqual([
			{ type: "text", value: "hi " },
			{ type: "user", id: USER },
		]);
	});

	it("parses channel and role mentions", () => {
		expect(tokenizeMentions(`go <#${CHANNEL}> see <%${ROLE}>`)).toEqual([
			{ type: "text", value: "go " },
			{ type: "channel", id: CHANNEL },
			{ type: "text", value: " see " },
			{ type: "role", id: ROLE },
		]);
	});

	it("parses @everyone and @online", () => {
		expect(tokenizeMentions("ping @everyone and @online")).toEqual([
			{ type: "text", value: "ping " },
			{ type: "everyone" },
			{ type: "text", value: " and " },
			{ type: "online" },
		]);
	});

	it("parses custom emoji ids as emoji tokens", () => {
		expect(tokenizeMentions(`wow :${USER}:`)).toEqual([
			{ type: "text", value: "wow " },
			{ type: "emoji", id: USER },
		]);
	});

	it("keeps newlines and surrounding text", () => {
		expect(tokenizeMentions(`line1\n<@${USER}>\nline3`)).toEqual([
			{ type: "text", value: "line1\n" },
			{ type: "user", id: USER },
			{ type: "text", value: "\nline3" },
		]);
	});

	it("leaves urls as text", () => {
		const url = "https://stoat.viniciusrangel.dev/app";
		expect(tokenizeMentions(`${url} <@${USER}>`)).toEqual([
			{ type: "text", value: `${url} ` },
			{ type: "user", id: USER },
		]);
	});

	it("handles adjacent mentions", () => {
		expect(tokenizeMentions(`<@${USER}><@${USER}>`)).toEqual([
			{ type: "user", id: USER },
			{ type: "user", id: USER },
		]);
	});

	it("normalizes lowercase ulids to uppercase", () => {
		const lower = USER.toLowerCase();
		expect(tokenizeMentions(`<@${lower}>`)).toEqual([
			{ type: "user", id: USER },
		]);
	});
});

describe("resolveUserMention", () => {
	it("returns the mapped display name when known", () => {
		const users = new Map([[USER, "ViniciusRangel"]]);
		expect(resolveUserMention(USER, users)).toEqual({
			id: USER,
			name: "ViniciusRangel",
			known: true,
		});
	});

	it("falls back to Unknown user when missing", () => {
		expect(resolveUserMention(USER, new Map())).toEqual({
			id: USER,
			name: "Unknown user",
			known: false,
		});
	});
});

describe("usersByIdFromMessages", () => {
	it("indexes author names by id", () => {
		const map = usersByIdFromMessages([
			{ authorId: USER, authorName: "Alice" },
			{ authorId: null, authorName: "ghost" },
			{ authorId: CHANNEL, authorName: "Bob" },
		]);
		expect(map.get(USER)).toBe("Alice");
		expect(map.get(CHANNEL)).toBe("Bob");
		expect(map.size).toBe(2);
	});

	it("skips Unknown placeholders so member lookups can fill them", () => {
		const map = usersByIdFromMessages([
			{ authorId: USER, authorName: "Unknown" },
			{ authorId: CHANNEL, authorName: "Unknown user" },
		]);
		expect(map.size).toBe(0);
	});
});

describe("mergeUserNameLookups", () => {
	it("later lookups override earlier ones", () => {
		const merged = mergeUserNameLookups(
			new Map([[USER, "Old"]]),
			new Map([[USER, "New"]]),
			undefined,
		);
		expect(merged.get(USER)).toBe("New");
	});
});
