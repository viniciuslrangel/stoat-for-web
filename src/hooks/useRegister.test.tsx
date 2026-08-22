import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { parseSessionId, parseUserId } from "@/domain/ids";
import { sessionAtom } from "@/domain/session";
import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { useRegister } from "./useRegister";

vi.mock("@/lib/register", () => ({
	createAccount: vi.fn(),
}));

vi.mock("@/lib/authenticate", () => ({
	loginWithPassword: vi.fn(),
	loginWithMfa: vi.fn(),
}));

vi.mock("@/lib/complete-login", () => ({
	completeLogin: vi.fn(),
}));

vi.mock("@/lib/auth-features", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/auth-features")>();
	return {
		...actual,
		fetchAuthFeatures: vi.fn(),
	};
});

import { fetchAuthFeatures } from "@/lib/auth-features";
import { loginWithPassword } from "@/lib/authenticate";
import { completeLogin } from "@/lib/complete-login";
import { createAccount } from "@/lib/register";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRegister", () => {
	beforeEach(() => {
		localStorage.clear();
		getDefaultStore().set(sessionAtom, { kind: "anonymous" });
		getDefaultStore().set(pendingCheckEmailAtom, null);
		vi.mocked(createAccount).mockReset();
		vi.mocked(loginWithPassword).mockReset();
		vi.mocked(completeLogin).mockReset();
		vi.mocked(fetchAuthFeatures).mockReset();
	});

	it("auto-logs in when email verification is off", async () => {
		vi.mocked(fetchAuthFeatures).mockResolvedValue({
			inviteOnly: true,
			emailVerification: false,
			captchaSiteKey: null,
		});
		vi.mocked(createAccount).mockResolvedValue(undefined);
		vi.mocked(loginWithPassword).mockResolvedValue({
			kind: "success",
			sessionId: parseSessionId("01SESSION"),
			token: "tok_abc",
			userId: parseUserId("01USER"),
		});
		vi.mocked(completeLogin).mockResolvedValue({ kind: "ready" });

		const { result } = renderHook(() => useRegister(), { wrapper });
		const outcome = await result.current.register({
			email: "a@b.co",
			password: "password1",
			invite: "code",
		});

		expect(createAccount).toHaveBeenCalledWith({
			email: "a@b.co",
			password: "password1",
			invite: "code",
		});
		expect(loginWithPassword).toHaveBeenCalled();
		expect(completeLogin).toHaveBeenCalled();
		expect(outcome?.kind).toBe("logged-in");
		expect(getDefaultStore().get(pendingCheckEmailAtom)).toBe("a@b.co");
	});

	it("goes to check-email when verification is on, without logging in", async () => {
		vi.mocked(fetchAuthFeatures).mockResolvedValue({
			inviteOnly: true,
			emailVerification: true,
			captchaSiteKey: null,
		});
		vi.mocked(createAccount).mockResolvedValue(undefined);

		const { result } = renderHook(() => useRegister(), { wrapper });
		const outcome = await result.current.register({
			email: "a@b.co",
			password: "password1",
		});

		expect(outcome?.kind).toBe("check-email");
		expect(loginWithPassword).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(getDefaultStore().get(pendingCheckEmailAtom)).toBe("a@b.co");
		});
	});
});
