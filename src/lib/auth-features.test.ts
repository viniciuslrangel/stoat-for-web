import { describe, expect, it } from "vite-plus/test";

import { parseAuthFeatures } from "./auth-features";

const base = {
	revolt: "0.8.9",
	ws: "wss://example.test/ws",
};

describe("parseAuthFeatures", () => {
	it("reads invite_only, email, and skips an empty captcha key", () => {
		expect(
			parseAuthFeatures({
				...base,
				features: {
					captcha: { enabled: false, key: "" },
					email: false,
					invite_only: true,
				},
			}),
		).toEqual({
			inviteOnly: true,
			emailVerification: false,
			captchaSiteKey: null,
		});
	});

	it("returns the captcha site key only when captcha is enabled", () => {
		expect(
			parseAuthFeatures({
				...base,
				features: {
					captcha: { enabled: true, key: "site-key" },
					email: true,
					invite_only: false,
				},
			}),
		).toEqual({
			inviteOnly: false,
			emailVerification: true,
			captchaSiteKey: "site-key",
		});
	});

	it("ignores a key when captcha is disabled", () => {
		expect(
			parseAuthFeatures({
				...base,
				features: {
					captcha: { enabled: false, key: "site-key" },
					email: true,
					invite_only: false,
				},
			}).captchaSiteKey,
		).toBeNull();
	});
});
