import { describe, expect, it } from "vite-plus/test";

import { messageForAccountFailure } from "./account-error";
import { AuthRequestError } from "./auth-error";

describe("messageForAccountFailure", () => {
	it("maps InvalidInvite", () => {
		expect(
			messageForAccountFailure(
				new AuthRequestError({
					type: "InvalidInvite",
					message: "Something went wrong. Try again.",
				}),
			),
		).toBe("That invite code is not valid.");
	});

	it("falls back to login messages", () => {
		expect(
			messageForAccountFailure(
				new AuthRequestError({
					type: "FeatureDisabled",
					message: "This sign-in method is disabled on this server.",
				}),
			),
		).toBe("This sign-in method is disabled on this server.");
	});
});
