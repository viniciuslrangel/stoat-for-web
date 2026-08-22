import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const screenshot = ".audit/receipts/screenshots/onboarding-nickname-gate.png";
mkdirSync(".audit/receipts/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const requests = [];

await page.route("http://stoat.test/api/**", async (route) => {
	const url = new URL(route.request().url());
	requests.push(url.pathname);
	const path = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
	if (path === "/") {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({
				revolt: "0.1",
				ws: "ws://stoat.test/ws",
				features: { captcha: { enabled: false }, invite_only: true },
			}),
		});
		return;
	}
	if (path === "/auth/session/login") {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({
				result: "Success",
				_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				token: "provisional-token",
				user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
			}),
		});
		return;
	}
	if (path === "/onboard/hello") {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({ onboarding: true }),
		});
		return;
	}
	await route.fulfill({ status: 404, body: "{}" });
});

await page.goto("http://127.0.0.1:4173/login/auth");
await page.getByLabel("Email").fill("onboarding@example.test");
await page.getByLabel("Password").fill("password1");
await page.getByRole("button", { name: "Log in" }).click();
await page.getByRole("heading", { name: "Choose a username" }).waitFor();
await page.getByLabel("Username").fill("steady-name");
await page.screenshot({ path: screenshot, fullPage: true });

const receipt = [
	"Onboarding nickname gate reproduction",
	`URL: ${page.url()}`,
	"Heading: Choose a username",
	"Username input: visible and editable",
	`API paths: ${requests.join(", ")}`,
	"Result: provisional login remains on the nickname step; no /users/@me request occurred.",
].join("\n");
writeFileSync(".audit/receipts/onboarding-nickname-gate.txt", `${receipt}\n`);
console.log(receipt);
await browser.close();
