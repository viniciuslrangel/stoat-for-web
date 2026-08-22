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

async function serverLinks(page) {
	return page
		.locator('[data-testid="server-rail"] a[href^="/server/"]')
		.evaluateAll((els) =>
			els.map((e) => ({
				href: e.getAttribute("href"),
				label: e.getAttribute("aria-label") || e.getAttribute("title"),
			})),
		);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => {
	if (msg.type() === "error" || msg.type() === "warning")
		errors.push(`${msg.type()}: ${msg.text()}`);
});

await page.goto("http://localhost:3000/login/auth", { waitUntil: "networkidle" });
await page.locator("#email").fill(env.E2E_EMAIL);
await page.locator("#password").fill(env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
await page.waitForSelector('[data-testid="server-rail"]');

for (const delay of [0, 500, 1500, 3000, 5000]) {
	if (delay) await page.waitForTimeout(delay - (delay === 500 ? 0 : [0,500,1500,3000][['500','1500','3000','5000'].indexOf(String(delay))] || 0));
}
// simpler polling
const timeline = [];
for (let i = 0; i < 10; i++) {
	timeline.push({ t: i * 500, links: await serverLinks(page), errors: [...errors] });
	await page.waitForTimeout(500);
}
console.log("timeline after login", JSON.stringify(timeline, null, 2));

await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="server-rail"]', { timeout: 30_000 });
const afterReload = [];
for (let i = 0; i < 10; i++) {
	afterReload.push({ t: i * 500, links: await serverLinks(page), errCount: errors.length });
	await page.waitForTimeout(500);
}
console.log("after reload", JSON.stringify(afterReload, null, 2));

await page.goto("http://localhost:3000/friends");
await page.waitForSelector('[data-testid="server-rail"]');
const onFriends = [];
for (let i = 0; i < 8; i++) {
	onFriends.push({ t: i * 500, links: await serverLinks(page) });
	await page.waitForTimeout(500);
}
console.log("on friends", JSON.stringify(onFriends, null, 2));
console.log("all errors", JSON.stringify(errors, null, 2));

await page.screenshot({ path: ".audit/receipts/screenshots/repro-app-reload.png" });
await browser.close();
