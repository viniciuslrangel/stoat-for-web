import {
	parseSessionId,
	parseUserId,
	type SessionId,
	type UserId,
} from "@/domain/ids";

export type MfaMethod = "Password" | "Recovery" | "Totp";

export type LoginResult =
	| {
			kind: "success";
			sessionId: SessionId;
			token: string;
			userId: UserId;
	  }
	| {
			kind: "mfa";
			ticket: string;
			allowedMethods: readonly MfaMethod[];
	  }
	| { kind: "disabled"; userId: UserId };

const MFA_METHODS = new Set<MfaMethod>(["Password", "Recovery", "Totp"]);

function parseMfaMethods(value: unknown): MfaMethod[] | null {
	if (!Array.isArray(value)) {
		return null;
	}
	const methods: MfaMethod[] = [];
	for (const item of value) {
		if (typeof item !== "string" || !MFA_METHODS.has(item as MfaMethod)) {
			return null;
		}
		methods.push(item as MfaMethod);
	}
	return methods;
}

export function parseLoginResult(raw: unknown): LoginResult {
	if (raw === null || typeof raw !== "object") {
		throw new TypeError("Invalid login response");
	}
	const record = raw as Record<string, unknown>;
	if (record.result === "Success") {
		if (typeof record.token !== "string" || record.token.length === 0) {
			throw new TypeError("Invalid login response");
		}
		return {
			kind: "success",
			sessionId: parseSessionId(record._id),
			token: record.token,
			userId: parseUserId(record.user_id),
		};
	}
	if (record.result === "MFA") {
		if (typeof record.ticket !== "string" || record.ticket.length === 0) {
			throw new TypeError("Invalid login response");
		}
		const allowedMethods = parseMfaMethods(record.allowed_methods);
		if (!allowedMethods) {
			throw new TypeError("Invalid login response");
		}
		return { kind: "mfa", ticket: record.ticket, allowedMethods };
	}
	if (record.result === "Disabled") {
		return { kind: "disabled", userId: parseUserId(record.user_id) };
	}
	throw new TypeError("Invalid login response");
}

export function mfaResponseForCode(
	code: string,
	allowedMethods: readonly MfaMethod[],
): { totp_code: string } | { recovery_code: string } | { password: string } {
	const trimmed = code.trim();
	if (allowedMethods.includes("Totp") && /^\d{6}$/.test(trimmed)) {
		return { totp_code: trimmed };
	}
	if (allowedMethods.includes("Recovery") && !allowedMethods.includes("Totp")) {
		return { recovery_code: trimmed };
	}
	if (allowedMethods.includes("Totp")) {
		return { totp_code: trimmed };
	}
	if (allowedMethods.includes("Recovery")) {
		return { recovery_code: trimmed };
	}
	if (allowedMethods.includes("Password")) {
		return { password: trimmed };
	}
	return { totp_code: trimmed };
}
