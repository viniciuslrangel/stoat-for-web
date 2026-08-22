import { describe, expect, it } from "vite-plus/test";

import { displayInitials } from "@/lib/display-initials";

describe("displayInitials", () => {
	it("uses first letters of two words", () => {
		expect(displayInitials("Ada Lovelace")).toBe("AL");
	});

	it("uses first two characters of a single token", () => {
		expect(displayInitials("stoattest")).toBe("ST");
	});

	it("trims and ignores empty segments", () => {
		expect(displayInitials("  Gui  Guilson  ")).toBe("GG");
	});
});
