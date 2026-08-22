import { describe, expect, it } from "vite-plus/test";

import {
	DEFAULT_USER_SETTINGS_PAGE,
	isUserSettingsPageId,
	USER_SETTINGS_GROUPS,
	USER_SETTINGS_PAGE_IDS,
} from "./userSettingsPages";

describe("userSettingsPages", () => {
	it("keeps account, appearance, and voice and nothing else", () => {
		expect([...USER_SETTINGS_PAGE_IDS]).toEqual([
			"account",
			"appearance",
			"voice",
		]);
		expect(DEFAULT_USER_SETTINGS_PAGE).toBe("account");
		const ids = USER_SETTINGS_GROUPS.flatMap((group) =>
			group.pages.map((page) => page.id),
		);
		expect(ids).toEqual(["account", "appearance", "voice"]);
		expect(isUserSettingsPageId("account")).toBe(true);
		expect(isUserSettingsPageId("nitro")).toBe(false);
	});
});
