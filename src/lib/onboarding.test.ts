import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { parseSessionId, parseUserId } from "@/domain/ids";
import { checkOnboarding, completeOnboarding } from "./onboarding";

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
