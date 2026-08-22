import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import { hasEnvTest } from "../helpers/env";

const receiptsDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../.audit/receipts",
);
const screenshotPath = resolve(
	receiptsDir,
	"screenshots/user-menu-settings.png",
);
const receiptPath = resolve(receiptsDir, "user-menu-settings.txt");

mkdirSync(dirname(screenshotPath), { recursive: true });

test.skip(!hasEnvTest(), "missing .env.test");

test.use({ viewport: { width: 1280, height: 720 } });

test("avatar menu opens User Settings overlay", async ({ page }) => {
	await loginViaUI(page);
	await expect(page).toHaveURL(/\/app/);
	await expect(page.getByTestId("user-voice-tray")).toBeVisible({
		timeout: 60_000,
	});
	await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible();

	await page.getByTestId("user-tray-avatar-menu").click();
	await expect(page.getByTestId("user-account-menu")).toBeVisible();
	await expect(page.getByTestId("user-account-menu-settings")).toBeVisible();

	await page.getByTestId("user-account-menu-settings").click();
	await expect(page).toHaveURL(/\/settings/);
	await expect(page.getByTestId("screen-settings")).toBeVisible();
	await expect(page.getByTestId("settings-categories")).toBeVisible();
	await expect(page.getByTestId("settings-panel")).toBeVisible();

	await page.screenshot({ path: screenshotPath, fullPage: false });

	writeFileSync(
		receiptPath,
		[
			"user-menu-settings",
			`url=${page.url()}`,
			"path=avatar menu → User Settings → /settings",
			`screenshot=${screenshotPath}`,
			"assert=screen-settings + settings-categories + settings-panel visible",
			"",
		].join("\n"),
		"utf8",
	);
});

test("gear icon still opens settings", async ({ page }) => {
	await loginViaUI(page);
	await expect(page.getByTestId("user-tray-settings")).toBeVisible({
		timeout: 60_000,
	});
	await page.getByTestId("user-tray-settings").click();
	await expect(page).toHaveURL(/\/settings/);
	await expect(page.getByTestId("screen-settings")).toBeVisible();
});
