import { defineConfig, devices } from "@playwright/test";

import { loadGitignoredEnv } from "./e2e/helpers/env";

loadGitignoredEnv();

const previewUrl = "http://127.0.0.1:4173";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	expect: {
		toHaveScreenshot: {
			animations: "disabled",
			caret: "hide",
			maxDiffPixelRatio: 0.02,
		},
	},
	use: {
		baseURL: previewUrl,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		viewport: { width: 1280, height: 720 },
	},
	projects: [
		{
			name: "chromium",
			testIgnore: "**/live/**",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "live",
			testMatch: "**/live/**/*.spec.ts",
			use: {
				...devices["Desktop Chrome"],
				screenshot: "on",
			},
		},
	],
	webServer: {
		command: "pnpm build && pnpm preview --host 127.0.0.1 --port 4173",
		url: previewUrl,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
