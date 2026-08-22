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
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const channelId = required("E2E_CHANNEL_ID");
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

const stamp = Date.now();
const payload = [
	`rich-content-proof ${stamp}`,
	"docs https://example.com/stoat-docs",
	"```ts",
	"const ok = true;",
	"```",
	"https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.png",
].join("\n");

const composer = page.locator('[data-testid="message-composer"]');
await composer.click();
await composer.fill(payload);
await page.keyboard.press("Enter");
await page.waitForTimeout(2500);

const proofRow = page
	.locator('[data-testid^="message-row-"]')
	.filter({ hasText: `rich-content-proof ${stamp}` })
	.last();
await proofRow.waitFor({ timeout: 30_000 });
await proofRow.scrollIntoViewIfNeeded();

const linkCount = await proofRow.locator('[data-testid="message-link"]').count();
const codeCount = await proofRow
	.locator('[data-testid="message-code-block"]')
	.count();
const contentImgCount = await proofRow
	.locator('[data-testid="message-content-image"]')
	.count();
const attachmentImgCount = await proofRow
	.locator('[data-testid="message-attachment-image"]')
	.count();
const shell = await page.locator('[data-testid="app-shell"]').count();
const list = await page.locator('[data-testid="message-list"]').count();

notes.push(
	`link=${linkCount} code=${codeCount} content_img=${contentImgCount} attachment_img=${attachmentImgCount}`,
);
notes.push(`shell=${shell} message_list=${list}`);

const shotPath = resolve(outDir, "message-rich-content.png");
await page.screenshot({ path: shotPath, fullPage: false });
notes.push(`shot=${shotPath}`);
notes.push(`page_url=${page.url()}`);

const pass =
	shell > 0 &&
	list > 0 &&
	linkCount > 0 &&
	codeCount > 0 &&
	contentImgCount + attachmentImgCount > 0;

const receipt = resolve(root, ".audit/receipts/message-rich-content.txt");
writeFileSync(
	receipt,
	[
		"message-rich-content",
		`verdict=${pass ? "PASS" : "FAIL"}`,
		`base=${base}`,
		`channel=${channelId}`,
		...notes,
		"pipeline=fences→mentions→autolinks→text via parseMessageContent + MessageContent",
		"attachments=MessageSnapshot.attachments plain Autumn urls; image kind embeds",
	].join("\n") + "\n",
);
console.log(readFileSync(receipt, "utf8"));

await browser.close();
if (!pass) process.exit(1);
