import { expect, test } from "@playwright/test";

test("root redirects to home", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/app\/?$/);
	await expect(page.getByTestId("screen-home")).toBeVisible();
});
