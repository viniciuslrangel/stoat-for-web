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
	"screenshots/settings-logout-login.png",
);
const receiptPath = resolve(receiptsDir, "settings-logout.txt");

mkdirSync(dirname(screenshotPath), { recursive: true });

test.skip(!hasEnvTest(), "missing .env.test");

test.use({ viewport: { width: 1280, height: 720 } });

test("settings logout reaches the real login form", async ({ page }) => {
	await loginViaUI(page);
	await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible({
		timeout: 60_000,
	});

	await page.getByTestId("user-tray-avatar-menu").click();
	await page.getByTestId("user-account-menu-settings").click();
	await expect(page).toHaveURL(/\/settings/);
	await expect(page.getByTestId("screen-settings")).toBeVisible();
	await expect(page.getByTestId("open-logout")).toBeVisible();

	await page.getByTestId("open-logout").click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await expect(page).toHaveURL(/\/settings/);
	await expect(page.getByTestId("screen-settings")).toBeVisible();

	await page.getByTestId("open-logout").click();
	await dialog.getByRole("button", { name: "Log out" }).click();
	await expect(page).toHaveURL(/\/login\/auth/);
	await expect(page.getByTestId("screen-login")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
	await expect(page.getByTestId("screen-settings")).toHaveCount(0);

	await page.screenshot({ path: screenshotPath, fullPage: false });
	writeFileSync(
		receiptPath,
		[
			"settings-logout",
			"result=PASS",
			`url=${page.url()}`,
			"path=Settings → My Account → Log out → confirm → /login/auth",
			"assert=real login form visible and settings shell absent",
			`screenshot=${screenshotPath}`,
			"",
		].join("\n"),
		"utf8",
	);
});
