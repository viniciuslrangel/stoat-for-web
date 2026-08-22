import { describe, expect, it } from "vite-plus/test";

import { extractInviteCode } from "./invite-input";

describe("extractInviteCode", () => {
	it("reads a bare invite code", () => {
		expect(extractInviteCode("wVEJDGVs")).toBe("wVEJDGVs");
	});

	it("reads /invite/ paths and stt.gg links", () => {
		expect(extractInviteCode("https://stoat.chat/invite/abc123")).toBe(
			"abc123",
		);
		expect(extractInviteCode("https://stt.gg/xyz789")).toBe("xyz789");
		expect(extractInviteCode("invite/code99")).toBe("code99");
	});

	it("trims whitespace", () => {
		expect(extractInviteCode("  abc123  ")).toBe("abc123");
	});

	it("rejects empty or unusable input", () => {
		expect(extractInviteCode("")).toBeNull();
		expect(extractInviteCode("   ")).toBeNull();
		expect(extractInviteCode("https://example.com/not-an-invite")).toBeNull();
		expect(extractInviteCode("hello world")).toBeNull();
	});
});
