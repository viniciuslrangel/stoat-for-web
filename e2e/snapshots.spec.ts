import { expect, test } from "@playwright/test";

/**
 * Visual regression baselines for stable, unauthenticated auth screens.
 * Update with: pnpm test:e2e:update-snapshots
 */
const snapshotScreens = [
	{ name: "welcome", path: "/login", testId: "screen-welcome" },
	{ name: "login", path: "/login/auth", testId: "screen-login" },
	{ name: "register", path: "/login/create", testId: "screen-register" },
	{ name: "check-email", path: "/login/check", testId: "screen-check-email" },
	{ name: "resend", path: "/login/resend", testId: "screen-resend" },
	{ name: "reset", path: "/login/reset", testId: "screen-reset" },
] as const;

for (const screen of snapshotScreens) {
	test(`${screen.name} matches screenshot`, async ({ page }) => {
		await page.goto(screen.path);
		await expect(page.getByTestId(screen.testId)).toBeVisible();
		await expect(page).toHaveScreenshot(`${screen.name}.png`, {
			fullPage: true,
		});
	});
}
