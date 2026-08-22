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
await page.waitForTimeout(1000);
console.log("after login", await serverLinks(page));

await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="server-rail"]', { timeout: 30_000 });
const afterReload = [];
for (let i = 0; i < 12; i++) {
	afterReload.push({ t: i * 500, links: await serverLinks(page) });
	if ((await serverLinks(page)).length > 0) break;
	await page.waitForTimeout(500);
}
console.log("after reload", JSON.stringify(afterReload, null, 2));

await page.screenshot({
	path: ".audit/receipts/screenshots/app-after-fix.png",
	fullPage: false,
});

await page.goto("http://localhost:3000/friends");
await page.waitForSelector('[data-testid="server-rail"]');
await page.waitForTimeout(1500);
console.log("on friends", await serverLinks(page));
const friendsBody = await page.locator("body").innerText();
console.log("friends has Online empty?", /No friends are online|Online/.test(friendsBody));
// Check All tab for zero friends messaging
await page.getByRole("tab", { name: "All" }).click().catch(async () => {
	await page.getByText("All", { exact: true }).click();
});
await page.waitForTimeout(500);
console.log("friends all text sample", (await page.locator("body").innerText()).slice(0, 600));
await page.screenshot({
	path: ".audit/receipts/screenshots/friends-after-fix.png",
	fullPage: false,
});

console.log("errors", JSON.stringify(errors, null, 2));
await browser.close();
