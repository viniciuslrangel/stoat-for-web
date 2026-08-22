import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import { e2eChannel, hasEnvTest } from "../helpers/env";

const screenshotPath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../../.audit/receipts/screenshots/channel-chat.png",
);

mkdirSync(dirname(screenshotPath), { recursive: true });

const channelId = process.env.E2E_CHANNEL_ID;
test.skip(!hasEnvTest() || !channelId, "missing .env.test or E2E_CHANNEL_ID");

test.use({ viewport: { width: 1280, height: 720 } });

test("signed-in channel shows Discord chat chrome", async ({ page }) => {
	const id = e2eChannel();

	await loginViaUI(page);
	await page.goto(`/channel/${id}`);

	await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId("server-sidebar")).toBeVisible({
		timeout: 60_000,
	});
	await expect(page.getByRole("heading", { name: "General" })).toBeVisible({
		timeout: 60_000,
	});

	const composer = page.getByTestId("message-composer");
	await expect(composer).toBeVisible({ timeout: 60_000 });
	await expect(composer).toHaveAttribute("placeholder", /Message #General/i);
	await expect(composer).toBeEnabled({ timeout: 60_000 });

	const emptyState = page.getByText(/No messages yet/i);
	const messageList = page.getByTestId("message-list");
	await expect(emptyState.or(messageList)).toBeVisible({ timeout: 60_000 });

	await page.screenshot({
		path: screenshotPath,
		fullPage: false,
	});

	const unique = `test_e2e_${Date.now()}`;
	await composer.fill(unique);
	await composer.press("Enter");
	await expect(page.getByText(unique, { exact: true })).toBeVisible({
		timeout: 30_000,
	});
});
