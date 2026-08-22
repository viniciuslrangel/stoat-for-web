import { AuthRequestError, parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import type { PersistedSession } from "@/lib/session-persist";

export type OnboardingState = {
	onboarding: boolean;
};

export const STOAT_USERNAME_MIN_LENGTH = 2;
export const STOAT_USERNAME_MAX_LENGTH = 32;

const USERNAME_PATTERN = /^(?:\p{L}|[0-9_.-])+$/u;
const BLOCKED_USERNAME_PATTERN =
	/```|(?:discord|rvlt|guilded|stt)\.gg|(?:revolt|stoat)\.chat|https?:\/\//i;

export function usernameValidationMessage(
	username: string,
): string | undefined {
	const trimmed = username.trim();
	const length = Array.from(trimmed).length;

	if (length < STOAT_USERNAME_MIN_LENGTH) {
		return "Username must be at least 2 characters.";
	}
	if (length > STOAT_USERNAME_MAX_LENGTH) {
		return "Username must be at most 32 characters.";
	}
	if (!USERNAME_PATTERN.test(trimmed)) {
		return "Username can only contain letters, numbers, underscores, periods, and hyphens.";
	}
	if (
		["admin", "revolt", "stoat"].includes(trimmed.toLocaleLowerCase("en-US")) ||
		BLOCKED_USERNAME_PATTERN.test(trimmed)
	) {
		return "This username is not allowed.";
	}

	return undefined;
}

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
