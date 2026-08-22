import { chromium } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

for (const path of [".env.local", ".env.test"]) {
	if (!existsSync(path)) continue;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const value = line.trim();
		if (!value || value.startsWith("#")) continue;
		const split = value.indexOf("=");
		if (split < 0) continue;
		const key = value.slice(0, split).trim();
		const val = value.slice(split + 1).trim().replace(/^["']|["']$/g, "");
		if (!(key in process.env)) process.env[key] = val;
	}
}

const required = ["E2E_EMAIL", "E2E_PASSWORD", "E2E_CHANNEL_ID"];
for (const key of required) {
	if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
	viewport: { width: 1280, height: 720 },
	colorScheme: "dark",
});
page.setDefaultTimeout(60_000);

await page.goto("http://127.0.0.1:3000/login/auth");
await page.getByLabel("Email").fill(process.env.E2E_EMAIL);
await page.getByLabel("Password").fill(process.env.E2E_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"));
await page.goto(
	`http://127.0.0.1:3000/channel/${process.env.E2E_CHANNEL_ID}`,
);
await page.getByTestId("screen-channel").waitFor({ state: "visible" });

const selectors = {
	app: '[data-testid="screen-channel"]',
	rail: '[data-testid="server-rail"]',
	sidebar: '[data-testid="server-sidebar"]',
	activeChannel: '[data-testid="server-sidebar"] a[href*="channel"]',
};
const styles = await page.evaluate((selectorMap) => {
	return Object.fromEntries(
		Object.entries(selectorMap).map(([name, selector]) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`Missing ${name}`);
			const style = getComputedStyle(element);
			return [
				name,
				{
					backgroundColor: style.backgroundColor,
					backgroundImage: style.backgroundImage,
				},
			];
		}),
	);
}, selectors);

for (const [name, style] of Object.entries(styles)) {
	if (style.backgroundImage === "none") {
		throw new Error(`${name} has no gradient background image`);
	}
}

console.log(JSON.stringify({ url: page.url(), styles }, null, 2));
await browser.close();
