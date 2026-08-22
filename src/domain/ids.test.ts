import { describe, expect, it } from "vite-plus/test";
import {
	parseBotId,
	parseChannelId,
	parseInviteCode,
	parseMessageId,
	parseRoleId,
	parseServerId,
	parseSessionId,
	parseUserId,
} from "./ids";

const parsers = [
	{ name: "parseUserId", parse: parseUserId, label: "UserId" },
	{ name: "parseServerId", parse: parseServerId, label: "ServerId" },
	{ name: "parseChannelId", parse: parseChannelId, label: "ChannelId" },
	{ name: "parseMessageId", parse: parseMessageId, label: "MessageId" },
	{ name: "parseRoleId", parse: parseRoleId, label: "RoleId" },
	{ name: "parseSessionId", parse: parseSessionId, label: "SessionId" },
	{ name: "parseInviteCode", parse: parseInviteCode, label: "InviteCode" },
	{ name: "parseBotId", parse: parseBotId, label: "BotId" },
] as const;

describe.each(parsers)("$name", ({ parse, label }) => {
	it("parses a non-empty trimmed string", () => {
		expect(parse("abc")).toBe("abc");
	});

	it("throws on empty string", () => {
		expect(() => parse("")).toThrow(new TypeError(`Invalid ${label}`));
	});

	it("throws on leading or trailing whitespace", () => {
		expect(() => parse(" abc")).toThrow(new TypeError(`Invalid ${label}`));
		expect(() => parse("abc ")).toThrow(new TypeError(`Invalid ${label}`));
		expect(() => parse("   ")).toThrow(new TypeError(`Invalid ${label}`));
	});

	it("throws on non-strings", () => {
		expect(() => parse(1)).toThrow(new TypeError(`Invalid ${label}`));
		expect(() => parse(null)).toThrow(new TypeError(`Invalid ${label}`));
	});
});
