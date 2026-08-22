import { describe, expect, it } from "vite-plus/test";

import { parseApiError } from "./auth-error";

describe("parseApiError", () => {
	it("uses the server validation body when present", () => {
		expect(
			parseApiError({
				type: "FailedValidation",
				error: "username: ValidationError(length)",
			}),
		).toEqual({
			type: "FailedValidation",
			message: "username: ValidationError(length)",
		});
	});

	it("uses the mapped message when the server has no message", () => {
		expect(parseApiError({ type: "InvalidUsername" })).toEqual({
			type: "InvalidUsername",
			message: "This username is not allowed.",
		});
	});
});
