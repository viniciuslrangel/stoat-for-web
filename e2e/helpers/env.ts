import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const envTestPath = resolve(root, ".env.test");
export const envLocalPath = resolve(root, ".env.local");

function applyEnvFile(filePath: string) {
	if (!existsSync(filePath)) return;

	for (const line of readFileSync(filePath, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;

		const key = trimmed.slice(0, eq).trim();
		const value = trimmed
			.slice(eq + 1)
			.trim()
			.replace(/^["']|["']$/g, "");
		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}

export function loadGitignoredEnv() {
	applyEnvFile(envLocalPath);
	applyEnvFile(envTestPath);
}

loadGitignoredEnv();

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Missing ${name}. Copy .env.test.example to .env.test or run node scripts/setup-e2e-account.mjs.`,
		);
	}
	return value;
}

export function hasEnvTest() {
	return existsSync(envTestPath);
}

export function e2eApiUrl() {
	const value = process.env.E2E_API_URL || process.env.VITE_STOAT_API_URL;
	if (!value) {
		throw new Error(
			"Missing E2E_API_URL or VITE_STOAT_API_URL. Set it in .env.test or .env.local.",
		);
	}
	return value;
}

export function e2eCredentials() {
	return {
		email: required("E2E_EMAIL"),
		password: required("E2E_PASSWORD"),
	};
}

export function e2eUsername() {
	return required("E2E_USERNAME");
}

export function e2eServer() {
	return {
		serverId: required("E2E_SERVER_ID"),
		channelId: required("E2E_CHANNEL_ID"),
	};
}

export function e2eChannel() {
	return required("E2E_CHANNEL_ID");
}
