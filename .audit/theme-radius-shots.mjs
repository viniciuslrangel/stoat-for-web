import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
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
const base = process.env.THEME_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const log = [];

async function shot(name) {
	const file = resolve(outDir, `theme-radius-${name}.png`);
	await page.screenshot({ path: file, fullPage: false });
	const line = `OK ${name} url=${page.url()} title=${await page.title()} -> ${file}`;
	console.log(line);
	log.push(line);
}

await page.goto(`${base}/login/auth`);
await page.waitForSelector("#email");
await shot("login");

await page.locator("#email").fill(required("E2E_EMAIL"));
await page.locator("#password").fill(required("E2E_PASSWORD"));
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.waitForSelector('[data-testid="app-shell"]', { timeout: 60_000 });
await page.waitForTimeout(1500);
await shot("app");

await page.goto(`${base}/friends`);
await page.waitForSelector('[data-testid="screen-friends"]', {
	timeout: 60_000,
});
await page.waitForTimeout(1000);
await shot("friends");

const channelId = process.env.E2E_CHANNEL_ID;
if (channelId) {
	await page.goto(`${base}/channel/${channelId}`);
	await page.waitForSelector(
		'[data-testid="screen-channel"], [data-testid="screen-channel-message"]',
		{ timeout: 60_000 },
	);
	await page.waitForTimeout(1500);
	await shot("channel");
}

await browser.close();
writeFileSync(resolve(outDir, "../theme-radius-shot-log.txt"), log.join("\n") + "\n");
console.log("done");
