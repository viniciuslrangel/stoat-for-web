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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (msg) => {
	const t = msg.type();
	if (t === "error" || t === "warning") console.log("CONSOLE", t, msg.text());
});
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));

await page.goto("http://localhost:3000/login/auth", { waitUntil: "networkidle" });
await page.locator("#email").fill(env.E2E_EMAIL);
await page.locator("#password").fill(env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
console.log("URL after login", page.url());

await page.waitForSelector('[data-testid="server-rail"]', { timeout: 30_000 });
await page.waitForTimeout(3000);

const serverLinks = await page
	.locator('[data-testid="server-rail"] a[href^="/server/"]')
	.evaluateAll((els) =>
		els.map((e) => ({
			href: e.getAttribute("href"),
			label: e.getAttribute("aria-label") || e.getAttribute("title"),
		})),
	);
console.log("serverLinks", JSON.stringify(serverLinks));
const railText = await page.locator('[data-testid="server-rail"]').innerText();
console.log("railText", JSON.stringify(railText));

await page.screenshot({
	path: ".audit/receipts/screenshots/repro-app-before-fix.png",
	fullPage: false,
});

await page.goto("http://localhost:3000/friends");
await page.waitForSelector('[data-testid="app-shell"]', { timeout: 15_000 });
await page.waitForTimeout(2000);
const body = await page.locator("body").innerText();
console.log("friends body head", body.slice(0, 800));
await page.screenshot({
	path: ".audit/receipts/screenshots/repro-friends-before-fix.png",
	fullPage: false,
});

await browser.close();
