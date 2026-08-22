import { defineConfig, devices } from "@playwright/test";

import { loadGitignoredEnv } from "./e2e/helpers/env";

loadGitignoredEnv();

export default defineConfig({
	testDir: "./e2e/live",
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: "http://localhost:3000",
		trace: "off",
		screenshot: "off",
		...devices["Desktop Chrome"],
	},
});
