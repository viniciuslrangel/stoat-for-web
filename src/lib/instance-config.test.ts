import { describe, expect, it } from "vite-plus/test";

import { parseInstanceConfig } from "./instance-config";

describe("parseInstanceConfig", () => {
	it("reads captcha and invite_only from GET /", () => {
		expect(
			parseInstanceConfig({
				revolt: "0.8.9",
				ws: "wss://example.test/ws",
				features: {
					captcha: { enabled: false, key: "" },
					invite_only: true,
				},
			}),
		).toEqual({
			version: "0.8.9",
			ws: "wss://example.test/ws",
			captchaEnabled: false,
			inviteOnly: true,
		});
	});

	it("throws when features are missing", () => {
		expect(() => parseInstanceConfig({ revolt: "1", ws: "wss://x" })).toThrow(
			TypeError,
		);
	});
});
