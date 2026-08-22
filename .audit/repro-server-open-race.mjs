import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

const env = Object.fromEntries(
	readFileSync(".env.test", "utf8")
		.split("\n")
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => {
			const i = l.indexOf("=");
			return [l.slice(0, i), l.slice(i + 1)];
		}),
);

async function measure(page, label) {
	await page.waitForSelector('[data-testid="message-list"]', { timeout: 30_000 });
	// Sample at multiple times without waiting for "success"
	const samples = [];
	for (const ms of [0, 100, 250, 500, 1000, 2000]) {
		if (ms) await page.waitForTimeout(ms - (samples.at(-1)?.t ?? 0));
		const rows = await page.locator('[data-testid^="message-row-"]').count();
		const empty = await page.getByText(/No messages yet/i).isVisible().catch(() => false);
		const loading = await page.locator('[data-testid="message-list"] .animate-pulse').count();
		samples.push({ t: ms, rows, empty, loadingSkeletons: loading });
	}
	console.log(label, JSON.stringify({ url: page.url(), samples }, null, 2));
	return samples;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:3000/login/auth", { waitUntil: "domcontentloaded" });
await page.locator("#email").fill(env.E2E_EMAIL);
await page.locator("#password").fill(env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
await page.waitForSelector('[data-testid="server-rail"] a[href^="/server/"]', { timeout: 60_000 });

// Case A: immediate click after rail appears (minimal settle)
await page.locator(`[data-testid="server-rail"] a[href="/server/${env.E2E_SERVER_ID}"]`).click();
await page.waitForURL((u) => u.pathname.startsWith("/channel/"), { timeout: 30_000 });
const a = await measure(page, "A-immediate-after-login");

// Case B: go home, then navigate via goto /server/id (programmatic, like redirect source)
await page.goto("http://localhost:3000/app");
await page.waitForSelector('[data-testid="server-rail"]');
await page.goto(`http://localhost:3000/server/${env.E2E_SERVER_ID}`);
await page.waitForURL((u) => u.pathname.startsWith("/channel/"), { timeout: 30_000 });
const b = await measure(page, "B-direct-server-url");

// Case C: reload while on channel (session restore path)
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="message-list"]', { timeout: 60_000 });
const c = await measure(page, "C-reload-on-channel");

// Case D: home -> click server, then home -> click server again quickly
await page.goto("http://localhost:3000/app");
await page.waitForSelector(`[data-testid="server-rail"] a[href="/server/${env.E2E_SERVER_ID}"]`);
await page.locator(`[data-testid="server-rail"] a[href="/server/${env.E2E_SERVER_ID}"]`).click();
await page.waitForURL((u) => u.pathname.startsWith("/channel/"), { timeout: 30_000 });
const d = await measure(page, "D-home-then-server");

const stuckEmpty = [a, b, c, d].some((samples) => {
	const last = samples[samples.length - 1];
	return last.empty && last.rows === 0 && last.t >= 2000;
});
console.log("STUCK_EMPTY", stuckEmpty);
await page.screenshot({ path: ".audit/receipts/screenshots/server-open-messages-race.png", fullPage: false });
await browser.close();
