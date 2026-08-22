import { describe, expect, it } from "vite-plus/test";
import { cn } from "./utils";

describe("cn", () => {
	it("merges tailwind classes and keeps the last conflicting utility", () => {
		expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
	});

	it("drops falsy values", () => {
		expect(cn("text-sm", false && "hidden", "font-medium")).toBe(
			"text-sm font-medium",
		);
	});
});
