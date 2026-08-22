import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { parseSessionId, parseUserId } from "@/domain/ids";
import {
	checkOnboarding,
	completeOnboarding,
	usernameValidationMessage,
} from "./onboarding";

const fetchMock = vi.fn();
const session = {
	_id: parseSessionId("01SESSION"),
	token: "token-for-test",
	userId: parseUserId("01USER"),
	valid: false,
};

vi.mock("@/lib/env", () => ({
	stoatApiBaseUrl: () => "https://api.test",
}));

describe("onboarding API", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});

	it("checks onboarding with the Stoat session header", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ onboarding: true }), {
				headers: { "Content-Type": "application/json" },
			}),
		);

		await expect(checkOnboarding(session)).resolves.toEqual({
			onboarding: true,
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.test/onboard/hello",
			expect.objectContaining({
				headers: {
					"Content-Type": "application/json",
					"X-Session-Token": "token-for-test",
				},
			}),
		);
	});

	it("completes onboarding without weakening response validation", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({}), {
				headers: { "Content-Type": "application/json" },
			}),
		);

		await expect(
			completeOnboarding(session, "new-user"),
		).resolves.toBeUndefined();
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.test/onboard/complete",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ username: "new-user" }),
			}),
		);
	});

	it("surfaces API errors for username completion", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ type: "UsernameTaken" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			}),
		);

		await expect(completeOnboarding(session, "taken")).rejects.toMatchObject({
			name: "AuthError",
			type: "UsernameTaken",
		});
	});
});

describe("Stoat username validation", () => {
	it.each([
		"new-user",
		"A.B_9",
		"汉字",
		"𝔸𝔹",
		"__",
	])("accepts server-valid username %j", (username) => {
		expect(usernameValidationMessage(username)).toBeUndefined();
	});

	it.each([
		["a", "Username must be at least 2 characters."],
		["a".repeat(33), "Username must be at most 32 characters."],
		[
			"name with spaces",
			"Username can only contain letters, numbers, underscores, periods, and hyphens.",
		],
		[
			"name/with/slashes",
			"Username can only contain letters, numbers, underscores, periods, and hyphens.",
		],
		[
			"name😀",
			"Username can only contain letters, numbers, underscores, periods, and hyphens.",
		],
		["admin", "This username is not allowed."],
		["StOaT", "This username is not allowed."],
		["discord.gg_test", "This username is not allowed."],
		["revolt.chat_test", "This username is not allowed."],
	] as const)("rejects server-invalid username %j", (username, message) => {
		expect(usernameValidationMessage(username)).toBe(message);
	});

	it("validates the trimmed value sent by onboarding", () => {
		expect(usernameValidationMessage("  New-User  ")).toBeUndefined();
	});
});
