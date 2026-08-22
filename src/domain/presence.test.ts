import { describe, expect, it } from "vite-plus/test";

import {
	PRESENCE_DOT_CLASS,
	parsePresence,
	presenceBadgeClass,
	presenceLabel,
} from "@/domain/presence";

describe("parsePresence", () => {
	it("forces Invisible when offline", () => {
		expect(parsePresence("Online", false)).toBe("Invisible");
		expect(parsePresence("Busy", false)).toBe("Invisible");
	});

	it("keeps known online statuses", () => {
		expect(parsePresence("Online", true)).toBe("Online");
		expect(parsePresence("Idle", true)).toBe("Idle");
		expect(parsePresence("Focus", true)).toBe("Focus");
		expect(parsePresence("Busy", true)).toBe("Busy");
		expect(parsePresence("Invisible", true)).toBe("Invisible");
	});

	it("defaults unknown online status to Online", () => {
		expect(parsePresence("Somewhere", true)).toBe("Online");
		expect(parsePresence(undefined, true)).toBe("Online");
	});
});

describe("presenceLabel", () => {
	it("maps Busy to Do Not Disturb and Invisible to Offline", () => {
		expect(presenceLabel("Busy")).toBe("Do Not Disturb");
		expect(presenceLabel("Invisible")).toBe("Offline");
		expect(presenceLabel("Focus")).toBe("Focus");
		expect(presenceLabel("Online")).toBe("Online");
		expect(presenceLabel("Idle")).toBe("Idle");
	});
});

describe("presence badge colors", () => {
	it("maps each presence to a Discord-like pip class", () => {
		expect(presenceBadgeClass("Online")).toBe("bg-[#23a55a]");
		expect(presenceBadgeClass("Idle")).toBe("bg-[#f0b232]");
		expect(presenceBadgeClass("Focus")).toBe("bg-[#3e70dd]");
		expect(presenceBadgeClass("Busy")).toBe("bg-[#f23f43]");
		expect(presenceBadgeClass("Invisible")).toBe("bg-[#80848e]");
	});

	it("covers every Presence key in PRESENCE_DOT_CLASS", () => {
		expect(Object.keys(PRESENCE_DOT_CLASS).sort()).toEqual(
			["Busy", "Focus", "Idle", "Invisible", "Online"].sort(),
		);
	});
});
