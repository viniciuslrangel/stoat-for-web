import { stoatApiBaseUrl } from "@/lib/env";

export type InstanceConfig = {
	version: string;
	ws: string;
	captchaEnabled: boolean;
	inviteOnly: boolean;
};

export function parseInstanceConfig(raw: unknown): InstanceConfig {
	if (raw === null || typeof raw !== "object") {
		throw new TypeError("Invalid instance config");
	}
	const record = raw as Record<string, unknown>;
	if (typeof record.revolt !== "string" || typeof record.ws !== "string") {
		throw new TypeError("Invalid instance config");
	}
	const features = record.features;
	if (features === null || typeof features !== "object") {
		throw new TypeError("Invalid instance config");
	}
	const featureRecord = features as Record<string, unknown>;
	const captcha = featureRecord.captcha;
	if (captcha === null || typeof captcha !== "object") {
		throw new TypeError("Invalid instance config");
	}
	const captchaRecord = captcha as Record<string, unknown>;
	if (typeof captchaRecord.enabled !== "boolean") {
		throw new TypeError("Invalid instance config");
	}
	if (typeof featureRecord.invite_only !== "boolean") {
		throw new TypeError("Invalid instance config");
	}
	return {
		version: record.revolt,
		ws: record.ws,
		captchaEnabled: captchaRecord.enabled,
		inviteOnly: featureRecord.invite_only,
	};
}

export const instanceConfigQueryKey = ["instance-config"] as const;

export async function fetchInstanceConfig(): Promise<InstanceConfig> {
	const response = await fetch(`${stoatApiBaseUrl()}/`);
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error("Could not load instance configuration");
	}
	return parseInstanceConfig(body);
}
