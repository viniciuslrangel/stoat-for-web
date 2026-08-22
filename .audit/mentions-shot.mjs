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
const base = process.env.MENTIONS_BASE_URL || "http://127.0.0.1:3000";
const channelId =
	process.env.MENTIONS_CHANNEL_ID || "01M0J8S8MC2K5BQVNH73HXCTAM";
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
notes.push(`logged_in url=${page.url()}`);

await page.goto(`${base}/channel/${channelId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="message-list"]', { timeout: 60_000 });
await page.waitForTimeout(1500);

const selfName =
	(await page
		.locator('[data-testid="rail-self-avatar"]')
		.getAttribute("title")
		.catch(() => null)) || "stoattest";

const meId = await page.evaluate(() => {
	const raw = localStorage.getItem("stoat.session.v1");
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed?.userId === "string") return parsed.userId;
		if (typeof parsed?.user_id === "string") return parsed.user_id;
		if (typeof parsed?.id === "string") return parsed.id;
	} catch {
		/* ignore */
	}
	return null;
});
notes.push(`me_id=${meId ?? "unknown"} self_hint=${selfName}`);

const mentionId = meId || "01M0DJ5Q6KX1BAJTTGKXHNPGV7";
const payload = `mention-proof <@${mentionId}>`;

const composer = page.locator('[data-testid="message-composer"]');
await composer.click();
await composer.fill(payload);
await page.keyboard.press("Enter");
await page.waitForTimeout(2000);

let chip = page.locator('[data-testid="mention-user"]').last();
let chipCount = await chip.count();
if (chipCount === 0) {
	notes.push("chip_missing_after_send; scanning existing messages");
	chipCount = await page.locator('[data-testid="mention-user"]').count();
}

const rawVisible = await page
	.locator(`text=<@${mentionId}>`)
	.count()
	.catch(() => 0);

notes.push(`mention_chips=${chipCount} raw_syntax_visible=${rawVisible}`);

if (chipCount > 0) {
	const text = await page.locator('[data-testid="mention-user"]').last().innerText();
	const title = await page
		.locator('[data-testid="mention-user"]')
		.last()
		.getAttribute("title");
	notes.push(`chip_text=${JSON.stringify(text)} chip_title=${title}`);
	await page
		.locator('[data-testid="mention-user"]')
		.last()
		.scrollIntoViewIfNeeded();
}

const shotPath = resolve(outDir, "mentions.png");
await page.screenshot({ path: shotPath, fullPage: false });
notes.push(`shot=${shotPath}`);
notes.push(`page_url=${page.url()}`);

const pass = chipCount > 0 && rawVisible === 0;
const receipt = resolve(root, ".audit/receipts/mentions.txt");
writeFileSync(
	receipt,
	[
		"mentions",
		`verdict=${pass ? "PASS" : "FAIL"}`,
		`base=${base}`,
		`channel=${channelId}`,
		...notes,
		"patterns=<@ULID> user, <#ULID> channel, <%ULID> role, @everyone, @online, :ULID: emoji(token only)",
		"resolve=usersByIdFromMessages(authorId→authorName) plain Map; Unknown user when missing",
		"MessageList_swap=<MessageContent content usersById /> on normal rows only; system rows untouched",
	].join("\n") + "\n",
);
console.log(readFileSync(receipt, "utf8"));

await browser.close();
if (!pass) process.exit(1);
