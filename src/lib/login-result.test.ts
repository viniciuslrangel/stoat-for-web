import { describe, expect, it } from "vite-plus/test";

import { mfaResponseForCode, parseLoginResult } from "./login-result";

describe("parseLoginResult", () => {
	it("parses a Success payload", () => {
		expect(
			parseLoginResult({
				result: "Success",
				_id: "01SESSION",
				user_id: "01USER",
				token: "tok_abc",
				name: "Stoat for Web",
			}),
		).toEqual({
			kind: "success",
			sessionId: "01SESSION",
			token: "tok_abc",
			userId: "01USER",
		});
	});

	it("parses an MFA challenge", () => {
		expect(
			parseLoginResult({
				result: "MFA",
				ticket: "mfa_ticket",
				allowed_methods: ["Totp", "Recovery"],
			}),
		).toEqual({
			kind: "mfa",
			ticket: "mfa_ticket",
			allowedMethods: ["Totp", "Recovery"],
		});
	});

	it("parses a Disabled account", () => {
		expect(parseLoginResult({ result: "Disabled", user_id: "01USER" })).toEqual(
			{
				kind: "disabled",
				userId: "01USER",
			},
		);
	});

	it("throws on garbage", () => {
		expect(() => parseLoginResult(null)).toThrow(TypeError);
		expect(() => parseLoginResult({ result: "Nope" })).toThrow(TypeError);
	});
});

describe("mfaResponseForCode", () => {
	it("sends a 6-digit totp code when Totp is allowed", () => {
		expect(mfaResponseForCode("123456", ["Totp", "Recovery"])).toEqual({
			totp_code: "123456",
		});
	});

	it("sends a recovery code when Totp is not allowed", () => {
		expect(mfaResponseForCode("abcd-efgh", ["Recovery"])).toEqual({
			recovery_code: "abcd-efgh",
		});
	});
});
