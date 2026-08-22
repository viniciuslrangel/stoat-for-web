import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import { e2eServer, hasEnvTest } from "../helpers/env";

const screenshotPath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../.audit/receipts/screenshots/single-user-avatar-after.png",
);

mkdirSync(dirname(screenshotPath), { recursive: true });

test.skip(!hasEnvTest(), "missing .env.test");

test.use({ viewport: { width: 1280, height: 720 } });

test("signed-in /app shows Discord shell and the e2e server in the rail", async ({
	page,
}) => {
	const { serverId } = e2eServer();
	const serverName = process.env.E2E_SERVER_NAME ?? "test_e2e_";

	await loginViaUI(page);
	await expect(page).toHaveURL(/\/app/);

	await expect(page.getByTestId("app-shell")).toBeVisible();
	await expect(page.getByTestId("screen-home")).toBeVisible();
	await expect(page.getByTestId("server-rail")).toBeVisible();
	await expect(page.getByTestId("home-sidebar")).toBeVisible();
	await expect(page.getByTestId("rail-self-avatar")).toHaveCount(0);
	await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible();
	await expect(
		page.getByTestId("user-tray-avatar-menu").locator('[data-slot="avatar"]'),
	).toHaveCount(1);

	const rail = page.getByTestId("server-rail");
	const byHref = rail.locator(`a[href="/server/${serverId}"]`);
	const byName = rail.getByRole("link", { name: serverName });
	await expect(byHref.or(byName)).toBeVisible({ timeout: 60_000 });

	await page.screenshot({
		path: screenshotPath,
		fullPage: false,
	});
});
