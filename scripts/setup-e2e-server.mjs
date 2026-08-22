#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envTestPath = resolve(root, ".env.test");
const envLocalPath = resolve(root, ".env.local");

function applyEnvFile(filePath) {
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

applyEnvFile(envLocalPath);
applyEnvFile(envTestPath);

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		console.error(
			`Missing ${name}. Use the existing gitignored e2e credentials.`,
		);
		process.exit(1);
	}
	return value;
}

function requireApiUrl() {
	const apiUrl = process.env.E2E_API_URL || process.env.VITE_STOAT_API_URL;
	if (!apiUrl) {
		console.error(
			"Missing E2E_API_URL or VITE_STOAT_API_URL. Set it in .env.local or .env.test.",
		);
		process.exit(1);
	}
	return apiUrl.replace(/\/$/, "");
}

async function api(apiUrl, path, { method = "GET", token, body } = {}) {
	const response = await fetch(`${apiUrl}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			...(token ? { "X-Session-Token": token } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});

	const text = await response.text();
	return { response, text, json: text ? JSON.parse(text) : null };
}

async function login(apiUrl, { email, password }) {
	const { response, text, json } = await api(apiUrl, "/auth/session/login", {
		method: "POST",
		body: {
			email,
			password,
			friendly_name: "Stoat E2E Server Setup",
		},
	});
	if (!response.ok) {
		throw new Error(`POST /auth/session/login → ${response.status}: ${text}`);
	}
	if (json.result !== "Success" || !json.token) {
		throw new Error(`Login did not succeed: result=${json.result}`);
	}
	return json;
}

async function fetchUsername(apiUrl, token) {
	const { response, text, json } = await api(apiUrl, "/users/@me", { token });
	if (!response.ok) {
		throw new Error(`GET /users/@me → ${response.status}: ${text}`);
	}
	if (typeof json?.username !== "string" || json.username.length === 0) {
		throw new Error("GET /users/@me returned no username");
	}
	return json.username;
}

async function createServer(apiUrl, token, name) {
	const { response, text, json } = await api(apiUrl, "/servers/create", {
		method: "POST",
		token,
		body: { name },
	});
	if (!response.ok) {
		throw new Error(`POST /servers/create → ${response.status}: ${text}`);
	}
	const serverId = json?.server?._id;
	const channelId = json?.channels?.[0]?._id;
	if (!serverId || !channelId) {
		throw new Error("Server create returned no server or channel id");
	}
	return { serverId, channelId };
}

function upsertEnvTest(updates) {
	if (!existsSync(envTestPath)) {
		throw new Error(`Missing ${envTestPath}. Do not register a new user.`);
	}

	const original = readFileSync(envTestPath, "utf8");
	const lines = original.split("\n");
	const seen = new Set();

	const next = lines.map((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) return line;

		const eq = trimmed.indexOf("=");
		if (eq === -1) return line;

		const key = trimmed.slice(0, eq).trim();
		if (!(key in updates)) return line;

		seen.add(key);
		return `${key}=${updates[key]}`;
	});

	for (const [key, value] of Object.entries(updates)) {
		if (seen.has(key)) continue;
		if (next.length > 0 && next[next.length - 1] === "") {
			next.splice(next.length - 1, 0, `${key}=${value}`);
		} else {
			next.push(`${key}=${value}`);
		}
	}

	let body = next.join("\n");
	if (!body.endsWith("\n")) body += "\n";
	writeFileSync(envTestPath, body, "utf8");
}

async function main() {
	if (!existsSync(envTestPath)) {
		console.error(`Missing ${envTestPath}. Do not register a new user.`);
		process.exit(1);
	}

	const apiUrl = requireApiUrl();
	const email = requireEnv("E2E_EMAIL");
	const password = requireEnv("E2E_PASSWORD");
	const session = await login(apiUrl, { email, password });
	const username = await fetchUsername(apiUrl, session.token);

	const serverName = `test_e2e_${Date.now()}`;
	const created = await createServer(apiUrl, session.token, serverName);

	upsertEnvTest({
		E2E_SERVER_ID: created.serverId,
		E2E_CHANNEL_ID: created.channelId,
		E2E_SERVER_NAME: serverName,
	});

	console.log(`Wrote ${envTestPath}`);
	console.log(`Username: ${username}`);
	console.log(`Server name: ${serverName}`);
	console.log(`Server: ${created.serverId}`);
	console.log(`Channel: ${created.channelId}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
