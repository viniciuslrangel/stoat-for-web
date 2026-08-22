import { AuthRequestError, parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import type { PersistedSession } from "@/lib/session-persist";

export type OnboardingState = {
	onboarding: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

async function request(
	session: PersistedSession,
	path: string,
	init?: RequestInit,
): Promise<unknown> {
	const response = await fetch(`${stoatApiBaseUrl()}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			"X-Session-Token": session.token,
			...init?.headers,
		},
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new AuthRequestError(parseApiError(payload));
	}
	return payload;
}

export async function checkOnboarding(
	session: PersistedSession,
): Promise<OnboardingState> {
	const payload = await request(session, "/onboard/hello");
	if (!isRecord(payload) || typeof payload.onboarding !== "boolean") {
		throw new TypeError("Invalid onboarding response");
	}
	return { onboarding: payload.onboarding };
}

export async function completeOnboarding(
	session: PersistedSession,
	username: string,
): Promise<void> {
	await request(session, "/onboard/complete", {
		method: "POST",
		body: JSON.stringify({ username }),
	});
}
