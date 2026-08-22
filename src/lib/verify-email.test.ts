import { describe, expect, it } from "vite-plus/test";

import { parseVerifyResult } from "./verify-email";

describe("parseVerifyResult", () => {
	it("reads an MFA ticket when present", () => {
		expect(parseVerifyResult({ ticket: { token: "mfa_ticket" } })).toEqual({
			kind: "success",
			mfaTicket: "mfa_ticket",
		});
	});

	it("treats an empty body as verified without a ticket", () => {
		expect(parseVerifyResult(null)).toEqual({
			kind: "success",
			mfaTicket: null,
		});
	});

	it("ignores a ticket object without a token", () => {
		expect(parseVerifyResult({ ticket: {} })).toEqual({
			kind: "success",
			mfaTicket: null,
		});
	});
});
