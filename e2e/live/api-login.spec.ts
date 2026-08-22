import { expect, test } from "@playwright/test";

import { loginViaAPI } from "../helpers/auth";
import { hasEnvTest } from "../helpers/env";

test.skip(!hasEnvTest(), "missing .env.test");

test("logs in via the live API", async () => {
	const session = await loginViaAPI();
	expect(session.result).toBe("Success");
	expect(session.token.length).toBeGreaterThan(0);
});
