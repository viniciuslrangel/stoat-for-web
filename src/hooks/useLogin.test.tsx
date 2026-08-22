import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { parseSessionId, parseUserId } from "@/domain/ids";
import { sessionAtom } from "@/domain/session";
import { useLogin } from "./useLogin";

const fetchMock = vi.fn();

vi.mock("@/lib/authenticate", () => ({
	loginWithPassword: vi.fn(),
	loginWithMfa: vi.fn(),
}));

vi.mock("@/lib/activate-session", () => ({
	activateSession: vi.fn(),
}));

import { activateSession } from "@/lib/activate-session";
import { loginWithPassword } from "@/lib/authenticate";
import { markPersistedSessionValid } from "@/lib/session-persist";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLogin", () => {
	beforeEach(() => {
		localStorage.clear();
		getDefaultStore().set(sessionAtom, { kind: "anonymous" });
		vi.mocked(loginWithPassword).mockReset();
		vi.mocked(activateSession).mockReset();
		fetchMock.mockReset();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ onboarding: false }), {
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
	});

	it("persists a provisional session and marks the atom ready after connect", async () => {
		vi.mocked(loginWithPassword).mockResolvedValue({
			kind: "success",
			sessionId: parseSessionId("01SESSION"),
			token: "tok_abc",
			userId: parseUserId("01USER"),
		});
		vi.mocked(activateSession).mockImplementation(async () => {
			markPersistedSessionValid();
		});

		const { result } = renderHook(() => useLogin(), { wrapper });
		const outcome = await result.current.login("a@b.co", "password1");

		expect(outcome?.kind).toBe("success");
		expect(
			JSON.parse(localStorage.getItem("stoat.session.v1") ?? "null"),
		).toMatchObject({
			_id: "01SESSION",
			token: "tok_abc",
			userId: "01USER",
			valid: true,
		});
		expect(getDefaultStore().get(sessionAtom)).toEqual({
			kind: "ready",
			userId: "01USER",
		});
		expect(activateSession).toHaveBeenCalled();
	});

	it("surfaces MFA instead of faking success", async () => {
		vi.mocked(loginWithPassword).mockResolvedValue({
			kind: "mfa",
			ticket: "ticket-1",
			allowedMethods: ["Totp"],
		});

		const { result } = renderHook(() => useLogin(), { wrapper });
		const outcome = await result.current.login("a@b.co", "password1");

		expect(outcome).toEqual({
			kind: "mfa",
			ticket: "ticket-1",
			allowedMethods: ["Totp"],
		});
		await waitFor(() => {
			expect(result.current.status).toMatchObject({
				kind: "mfa",
				ticket: "ticket-1",
			});
		});
		expect(getDefaultStore().get(sessionAtom)).toEqual({ kind: "anonymous" });
		expect(activateSession).not.toHaveBeenCalled();
	});

	it("stops before /users/@me while onboarding is required", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ onboarding: true }), {
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.mocked(loginWithPassword).mockResolvedValue({
			kind: "success",
			sessionId: parseSessionId("01SESSION"),
			token: "tok_abc",
			userId: parseUserId("01USER"),
		});

		const { result } = renderHook(() => useLogin(), { wrapper });
		const outcome = await result.current.login("a@b.co", "password1");

		expect(outcome).toBeNull();
		await waitFor(() => expect(result.current.status.kind).toBe("onboarding"));
		expect(result.current.status).toMatchObject({
			kind: "onboarding",
			session: { valid: false, token: "tok_abc" },
		});
		expect(activateSession).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/onboard/hello"),
			expect.objectContaining({
				headers: expect.objectContaining({
					"X-Session-Token": "tok_abc",
				}),
			}),
		);
		expect(
			fetchMock.mock.calls.some(([url]) => String(url).includes("/users/@me")),
		).toBe(false);
	});
});
