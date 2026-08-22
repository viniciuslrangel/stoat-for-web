import { describe, expect, it } from "vite-plus/test";

import { mailProviderFor } from "./mail-provider";

describe("mailProviderFor", () => {
	it("maps Gmail", () => {
		expect(mailProviderFor("person@gmail.com")).toEqual({
			label: "Gmail",
			href: "https://gmail.com",
		});
	});

	it("falls back to the domain for unknown providers", () => {
		expect(mailProviderFor("a@example.com")).toEqual({
			label: "example.com",
			href: "https://example.com",
		});
	});

	it("returns null when there is no email", () => {
		expect(mailProviderFor(null)).toBeNull();
		expect(mailProviderFor("not-an-email")).toBeNull();
	});
});
