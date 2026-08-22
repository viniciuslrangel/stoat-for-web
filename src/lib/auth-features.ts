import { stoatApiBaseUrl } from "@/lib/env";

export type AuthFeatures = {
	inviteOnly: boolean;
	emailVerification: boolean;
	captchaSiteKey: string | null;
};

export const authFeaturesQueryKey = ["auth-features"] as const;

function asRecord(raw: unknown): Record<string, unknown> | null {
	if (raw === null || typeof raw !== "object") {
		return null;
	}
	return raw as Record<string, unknown>;
}

export function parseAuthFeatures(raw: unknown): AuthFeatures {
	const record = asRecord(raw);
	if (!record) {
		throw new TypeError("Invalid instance config");
	}
	const features = asRecord(record.features);
	if (!features) {
		throw new TypeError("Invalid instance config");
	}
	if (typeof features.invite_only !== "boolean") {
		throw new TypeError("Invalid instance config");
	}
	if (typeof features.email !== "boolean") {
		throw new TypeError("Invalid instance config");
	}
	const captcha = asRecord(features.captcha);
	if (!captcha || typeof captcha.enabled !== "boolean") {
		throw new TypeError("Invalid instance config");
	}
	const key = typeof captcha.key === "string" ? captcha.key.trim() : "";
	return {
		inviteOnly: features.invite_only,
		emailVerification: features.email,
		captchaSiteKey: captcha.enabled && key.length > 0 ? key : null,
	};
}

export async function fetchAuthFeatures(): Promise<AuthFeatures> {
	const response = await fetch(`${stoatApiBaseUrl()}/`);
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error("Could not load instance configuration");
	}
	return parseAuthFeatures(body);
}
