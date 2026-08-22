import { describe, expect, it } from "vite-plus/test";

import { friendlyName } from "./friendly-name";

describe("friendlyName", () => {
	it("formats chrome on Linux", () => {
		expect(
			friendlyName({
				userAgent:
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			}),
		).toBe("Stoat for Web (chrome on Linux)");
	});

	it("formats safari on Mac OS", () => {
		expect(
			friendlyName({
				userAgent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			}),
		).toBe("Stoat for Web (safari on Mac OS)");
	});

	it("falls back when the user agent is empty", () => {
		expect(friendlyName({ userAgent: "" })).toBe(
			"Stoat for Web (Unknown Device)",
		);
	});
});
