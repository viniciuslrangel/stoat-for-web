import { describe, expect, it } from "vite-plus/test";

import { resolveSettingsCloseAction } from "./useSettingsOverlay";

describe("resolveSettingsCloseAction", () => {
	it("goes back when history has a previous entry", () => {
		expect(resolveSettingsCloseAction(true)).toEqual({ kind: "back" });
	});

	it("navigates to /app when /settings is the first entry", () => {
		expect(resolveSettingsCloseAction(false)).toEqual({
			kind: "navigate",
			to: "/app",
		});
	});
});
