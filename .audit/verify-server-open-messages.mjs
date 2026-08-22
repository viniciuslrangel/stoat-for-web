import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

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
const shot =
	".audit/receipts/screenshots/server-open-messages.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:3000/login/auth", {
	waitUntil: "domcontentloaded",
});
await page.locator("#email").fill(env.E2E_EMAIL);
await page.locator("#password").fill(env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.waitForSelector('[data-testid="server-rail"]', { timeout: 60_000 });

// Ensure we start from home so server click is a real navigation
await page.goto("http://localhost:3000/app");
await page.waitForSelector(
	`[data-testid="server-rail"] a[href="/server/${env.E2E_SERVER_ID}"]`,
	{ timeout: 60_000 },
);

await page
	.locator(
		`[data-testid="server-rail"] a[href="/server/${env.E2E_SERVER_ID}"]`,
	)
	.click();

await page.waitForURL((url) => url.pathname.startsWith("/channel/"), {
	timeout: 30_000,
});

// First landing only — do NOT click another channel
await page.waitForSelector('[data-testid="screen-channel"]', {
	timeout: 30_000,
});
await page.waitForSelector('[data-testid="message-list"]', { timeout: 30_000 });

const heading = page.getByRole("heading", { name: "General" });
await heading.waitFor({ timeout: 30_000 });

const composer = page.getByTestId("message-composer");
await composer.waitFor({ timeout: 30_000 });
const placeholder = await composer.getAttribute("placeholder");

const empty = page.getByText(/No messages yet/i);
const rows = page.locator('[data-testid^="message-row-"]');

// Poll up to 10s for either messages or empty-state (no second channel click)
let ok = false;
let rowCount = 0;
let emptyVisible = false;
for (let i = 0; i < 20; i++) {
	rowCount = await rows.count();
	emptyVisible = await empty.isVisible().catch(() => false);
	if (rowCount > 0 || emptyVisible) {
		ok = true;
		break;
	}
	await page.waitForTimeout(500);
}

await page.screenshot({ path: shot, fullPage: false });

const result = {
	ok,
	url: page.url(),
	heading: await heading.innerText(),
	placeholder,
	rowCount,
	emptyVisible,
	channelClicksAfterServer: 0,
	shot,
};
console.log(JSON.stringify(result, null, 2));
writeFileSync(
	".audit/receipts/server-open-messages.verify.json",
	JSON.stringify(result, null, 2),
);
if (!ok) {
	process.exitCode = 1;
}
await browser.close();
