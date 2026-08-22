import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const screenshotDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../.audit/receipts/screenshots",
);

mkdirSync(screenshotDir, { recursive: true });

test("onboarding validates username rules and displays server errors", async ({
	page,
}) => {
	let completeRequests = 0;

	await page.route("**/auth/session/login", (route) =>
		route.fulfill({
			json: {
				result: "Success",
				_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				token: "onboarding-test-token",
				user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
			},
		}),
	);
	await page.route("**/onboard/hello", (route) =>
		route.fulfill({ json: { onboarding: true } }),
	);
	await page.route("**/onboard/complete", (route) => {
		completeRequests += 1;
		return route.fulfill({
			status: 400,
			json: {
				type: "FailedValidation",
				error: "username: server validation details",
			},
		});
	});

	await page.goto("/login/auth");
	await page.getByLabel("Email").fill("onboarding@example.com");
	await page.getByLabel("Password").fill("password1");
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose a username" }),
	).toBeVisible();

	await page.getByLabel("Username").fill("bad name");
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"Username can only contain letters, numbers, underscores, periods, and hyphens.",
	);
	expect(completeRequests).toBe(0);

	await page.getByLabel("Username").fill("new-user");
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"username: server validation details",
	);
	expect(completeRequests).toBe(1);
	await page.screenshot({
		path: resolve(screenshotDir, "onboarding-username-validation.png"),
		fullPage: true,
	});
});
