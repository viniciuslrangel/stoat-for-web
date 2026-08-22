import { accountRequest } from "@/lib/account-request";
import { AuthRequestError, parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import { friendlyName } from "@/lib/friendly-name";
import { type LoginResult, parseLoginResult } from "@/lib/login-result";

export type VerifyResult = {
	kind: "success";
	mfaTicket: string | null;
};

function asRecord(raw: unknown): Record<string, unknown> | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	return raw as Record<string, unknown>;
}

export function parseVerifyResult(raw: unknown): VerifyResult {
	const record = asRecord(raw);
	if (!record) {
		return { kind: "success", mfaTicket: null };
	}
	const ticket = asRecord(record.ticket);
	if (ticket && typeof ticket.token === "string" && ticket.token.length > 0) {
		return { kind: "success", mfaTicket: ticket.token };
	}
	return { kind: "success", mfaTicket: null };
}

export async function verifyAccount(token: string): Promise<VerifyResult> {
	const payload = await accountRequest({
		method: "POST",
		path: `/auth/account/verify/${encodeURIComponent(token)}`,
	});
	return parseVerifyResult(payload);
}

export async function loginWithTicket(ticket: string): Promise<LoginResult> {
	const response = await fetch(`${stoatApiBaseUrl()}/auth/session/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			mfa_ticket: ticket,
			friendly_name: friendlyName(),
		}),
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new AuthRequestError(parseApiError(payload));
	}
	return parseLoginResult(payload);
}
