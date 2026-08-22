import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import { hasEnvTest } from "../helpers/env";

const screenshotDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../../.audit/receipts/screenshots",
);

mkdirSync(screenshotDir, { recursive: true });

test.skip(!hasEnvTest(), "missing .env.test");

test("Welcome at /login shows Log in and Sign up", async ({ page }) => {
	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
	await page.screenshot({
		path: resolve(screenshotDir, "welcome.png"),
		fullPage: true,
	});
});

test("/login/auth shows the email and password form", async ({ page }) => {
	await page.goto("/login/auth");
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
	await page.screenshot({
		path: resolve(screenshotDir, "login-auth.png"),
		fullPage: true,
	});
});

test("loginViaUI reaches /app", async ({ page }) => {
	await loginViaUI(page);
	await expect(page).toHaveURL(/\/app/);
	await page.screenshot({
		path: resolve(screenshotDir, "app-after-login.png"),
		fullPage: true,
	});
});
