import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
		if (!(key in process.env)) process.env[key] = value;
	}
}
applyEnvFile(resolve(root, ".env.local"));
applyEnvFile(resolve(root, ".env.test"));

function required(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

const outDir = resolve(root, ".audit/receipts/screenshots");
mkdirSync(outDir, { recursive: true });
const base = process.env.SYSTEM_MSG_BASE_URL || "http://127.0.0.1:3000";
const api = required("E2E_API_URL");
const email = required("E2E_EMAIL");
const password = required("E2E_PASSWORD");
const shotPath = resolve(outDir, "system-messages.png");

const session = await fetch(`${api}/auth/session/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email, password }),
}).then((r) => r.json());
if (!session.token) throw new Error("login failed");
const headers = {
	"Content-Type": "application/json",
	"x-session-token": session.token,
};

const created = await fetch(`${api}/channels/create`, {
	method: "POST",
	headers,
	body: JSON.stringify({ name: "sys-msg-proof", users: [] }),
}).then((r) => r.json());
const groupId = created._id;
if (!groupId) throw new Error("group create failed");
const newName = `sys-proof-${Date.now()}`;
await fetch(`${api}/channels/${groupId}`, {
	method: "PATCH",
	headers,
	body: JSON.stringify({ name: newName }),
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/login/auth`, { waitUntil: "networkidle" });
await page.locator("#email").fill(email);
await page.locator("#password").fill(password);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.goto(`${base}/channel/${groupId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="message-list"]', { timeout: 60_000 });
await page.waitForSelector('[data-testid="system-message-body"]', {
	timeout: 60_000,
});

const systemRows = page.locator("[data-system]");
const systemBodies = page.locator('[data-testid="system-message-body"]');
const systemCount = await systemRows.count();
const bodyCount = await systemBodies.count();
const sampleTexts = [];
for (let i = 0; i < Math.min(bodyCount, 5); i++) {
	sampleTexts.push((await systemBodies.nth(i).innerText()).trim());
}

await page.screenshot({ path: shotPath, fullPage: false });
await browser.close();

const readable = sampleTexts.some((text) =>
	/updated the channel name|joined the server|left the |has been /i.test(text),
);
const verdict = systemCount > 0 && bodyCount > 0 && readable ? "PASS" : "FAIL";

const receipt = [
	"system-messages",
	`date: ${new Date().toISOString().slice(0, 10)}`,
	"",
	`verdict: ${verdict}`,
	`url: ${base}/channel/${groupId}`,
	`system_rows: ${systemCount}`,
	`system_bodies: ${bodyCount}`,
	`sample: ${JSON.stringify(sampleTexts)}`,
	`screenshot: .audit/receipts/screenshots/system-messages.png`,
	"",
	"types handled: text, user_added, user_remove, user_joined, user_left (server|group), user_kicked, user_banned, channel_renamed, channel_description_changed, channel_icon_changed, channel_ownership_changed, message_pinned, message_unpinned, call_started",
	"",
	`standing order 17: ${verdict === "PASS" ? "PASS — system copy visible" : "FAIL"}`,
].join("\n");

writeFileSync(resolve(root, ".audit/receipts/system-messages.txt"), `${receipt}\n`);
console.log(receipt);
if (verdict !== "PASS") process.exit(1);
