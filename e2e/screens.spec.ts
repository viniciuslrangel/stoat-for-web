import { expect, test } from "@playwright/test";
import { screens } from "../src/domain/screens";

for (const screen of screens) {
	test(screen.title, async ({ page }) => {
		await page.goto(screen.samplePath);
		await expect(page.getByTestId(`screen-${screen.id}`)).toBeVisible();
	});
}
