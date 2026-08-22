import { describe, expect, it } from "vite-plus/test";
import { brandAs } from "./brand";

describe("brandAs", () => {
	it("returns the same runtime value", () => {
		expect(brandAs<string, "UserId">("user_1")).toBe("user_1");
	});

	it("brands non-string values without changing them", () => {
		expect(brandAs<number, "Count">(7)).toBe(7);
	});
});
