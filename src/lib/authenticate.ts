import { AuthRequestError, parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";
import { friendlyName } from "@/lib/friendly-name";
import {
	type LoginResult,
	type MfaMethod,
	mfaResponseForCode,
	parseLoginResult,
} from "@/lib/login-result";

export type PasswordLoginInput = {
	email: string;
	password: string;
};

export type MfaLoginInput = {
	ticket: string;
	code: string;
	allowedMethods: readonly MfaMethod[];
};

async function postLogin(body: unknown): Promise<LoginResult> {
	const response = await fetch(`${stoatApiBaseUrl()}/auth/session/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new AuthRequestError(parseApiError(payload));
	}
	return parseLoginResult(payload);
}

export async function loginWithPassword(
	input: PasswordLoginInput,
): Promise<LoginResult> {
	return postLogin({
		email: input.email,
		password: input.password,
		friendly_name: friendlyName(),
	});
}

export async function loginWithMfa(input: MfaLoginInput): Promise<LoginResult> {
	return postLogin({
		mfa_ticket: input.ticket,
		mfa_response: mfaResponseForCode(input.code, input.allowedMethods),
		friendly_name: friendlyName(),
	});
}
