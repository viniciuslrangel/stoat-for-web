import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "fs";

const env = Object.fromEntries(
	readFileSync(".env.test", "utf8")
		.split("\n")
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => {
			const i = l.indexOf("=");
			return [l.slice(0, i), l.slice(i + 1)];
		}),
);

mkdirSync(".audit/receipts/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const log = [];
page.on("console", (msg) => {
	if (msg.type() === "error" || msg.type() === "warning") {
		log.push(`${msg.type()}: ${msg.text()}`);
	}
});
page.on("pageerror", (err) => log.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:3000/login/auth", { waitUntil: "networkidle" });
await page.locator("#email").fill(env.E2E_EMAIL);
await page.locator("#password").fill(env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
await page.waitForSelector('[data-testid="server-rail"]', { timeout: 60_000 });
await page.waitForTimeout(1500);

const serverHref = `/server/${env.E2E_SERVER_ID}`;
const serverLink = page.locator(`[data-testid="server-rail"] a[href="${serverHref}"]`);
console.log("server link count", await serverLink.count());
console.log("before click url", page.url());

// Prefer home first so server click is a fresh navigation
await page.goto("http://localhost:3000/app");
await page.waitForSelector('[data-testid="server-rail"]', { timeout: 30_000 });
await page.waitForTimeout(800);

await serverLink.first().click();
await page.waitForURL((url) => url.pathname.startsWith("/channel/"), {
	timeout: 30_000,
});
console.log("after server click url", page.url());

await page.waitForSelector('[data-testid="screen-channel"]', { timeout: 30_000 });
await page.waitForSelector('[data-testid="message-list"]', { timeout: 30_000 });
// Give messages a chance to load
await page.waitForTimeout(2500);

const heading = await page.locator("h1").first().innerText().catch(() => "");
const emptyVisible = await page.getByText(/No messages yet/i).isVisible().catch(() => false);
const messageRows = await page.locator('[data-testid^="message-row-"]').count();
const listText = (await page.getByTestId("message-list").innerText().catch(() => "")).slice(0, 400);
const composerPh = await page.getByTestId("message-composer").getAttribute("placeholder");

console.log(
	JSON.stringify(
		{
			phase: "first-land",
			url: page.url(),
			heading,
			emptyVisible,
			messageRows,
			composerPh,
			listText,
		},
		null,
		2,
	),
);

await page.screenshot({
	path: ".audit/receipts/screenshots/server-open-messages-before.png",
	fullPage: false,
});

// Switch to another channel if present, then back
const channelLinks = page.locator('[data-testid="server-sidebar"] a[href^="/channel/"]');
const hrefs = await channelLinks.evaluateAll((els) =>
	els.map((e) => e.getAttribute("href")),
);
console.log("sidebar channels", hrefs);
const other = hrefs.find((h) => h && !page.url().includes(h.split("/").pop()));
if (other) {
	await page.locator(`[data-testid="server-sidebar"] a[href="${other}"]`).click();
	await page.waitForTimeout(1500);
	const midRows = await page.locator('[data-testid^="message-row-"]').count();
	const midEmpty = await page.getByText(/No messages yet/i).isVisible().catch(() => false);
	console.log(JSON.stringify({ phase: "switched-away", url: page.url(), midRows, midEmpty }));

	const backHref = `/channel/${env.E2E_CHANNEL_ID}`;
	await page.locator(`[data-testid="server-sidebar"] a[href="${backHref}"]`).click();
	await page.waitForTimeout(2000);
	const backRows = await page.locator('[data-testid^="message-row-"]').count();
	const backEmpty = await page.getByText(/No messages yet/i).isVisible().catch(() => false);
	const backText = (await page.getByTestId("message-list").innerText().catch(() => "")).slice(
		0,
		400,
	);
	console.log(
		JSON.stringify(
			{
				phase: "switched-back",
				url: page.url(),
				backRows,
				backEmpty,
				backText,
			},
			null,
			2,
		),
	);
} else {
	console.log("no other channel to switch to");
}

console.log("errors", JSON.stringify(log.slice(0, 30), null, 2));
await browser.close();
