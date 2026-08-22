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
const base = process.env.PRESENCE_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const notes = [];

await page.goto(`${base}/login/auth`, { waitUntil: "networkidle" });
await page.locator("#email").fill(required("E2E_EMAIL"));
await page.locator("#password").fill(required("E2E_PASSWORD"));
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.waitForSelector('[data-testid="app-shell"]', { timeout: 60_000 });
await page.waitForSelector('[data-testid="rail-self-avatar"]', {
	timeout: 60_000,
});
await page.waitForTimeout(1500);

const railBadge = page.locator(
	'[data-testid="rail-self-avatar"] [data-testid="presence-badge"]',
);
const railCount = await railBadge.count();
const railPresence =
	railCount > 0 ? await railBadge.first().getAttribute("data-presence") : null;
notes.push(`rail badge count=${railCount} presence=${railPresence}`);

const railPath = resolve(outDir, "presence-rail.png");
await page.screenshot({ path: railPath, fullPage: false });
notes.push(`rail shot ${railPath} url=${page.url()}`);

await page.goto(`${base}/friends`);
await page.waitForSelector('[data-testid="screen-friends"]', {
	timeout: 60_000,
});
await page.waitForTimeout(1200);

const friendBadges = page.locator('[data-testid="presence-badge"]');
const friendBadgeCount = await friendBadges.count();
notes.push(`friends page presence badges=${friendBadgeCount}`);

const friendsPath = resolve(outDir, "presence-friends.png");
await page.screenshot({ path: friendsPath, fullPage: false });
notes.push(`friends shot ${friendsPath} url=${page.url()}`);

if (railCount < 1) {
	throw new Error("Rail self avatar missing presence badge");
}

const receipt = resolve(root, ".audit/receipts/presence-avatars.txt");
writeFileSync(
	receipt,
	[
		"presence-avatars",
		`base=${base}`,
		...notes,
		`rail_ok=${railCount >= 1}`,
		`friends_badges=${friendBadgeCount}`,
		`Busy_label=Do Not Disturb (domain/presence presenceLabel)`,
		`surfaces=ServerRail self, FriendRow, HomeSidebar DM, FriendProfileDialog`,
		`member_list=skipped (names only, no avatars/user ids)`,
	].join("\n") + "\n",
);
console.log(readFileSync(receipt, "utf8"));

await browser.close();
