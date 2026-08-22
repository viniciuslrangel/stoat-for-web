import { getDefaultStore } from "jotai";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { DEFAULT_VOICE_AUDIO_PREFS } from "@/lib/voice/types";
import {
	CHANNEL_CALL_SPLIT,
	CHANNEL_LIST_WIDTH,
	channelCallSplitAtom,
	channelListWidthAtom,
	clampChannelCallSplit,
	clampChannelListWidth,
	clampMemberListWidth,
	DEFAULT_FRIENDS_TAB,
	friendsTabAtom,
	MEMBER_LIST_WIDTH,
	membersCollapsedAtom,
	migrateLegacyPrefKeys,
	PREFS_KEY,
	parseFriendsTab,
	parseMembersCollapsed,
	parseSettingsPage,
	parseVoiceAudioPrefs,
	settingsPageAtom,
	voiceAudioPrefsAtom,
} from "@/state/prefs";

describe("clampChannelListWidth", () => {
	it("keeps values inside the channel list range", () => {
		expect(clampChannelListWidth(248)).toBe(248);
		expect(clampChannelListWidth(CHANNEL_LIST_WIDTH.min)).toBe(
			CHANNEL_LIST_WIDTH.min,
		);
		expect(clampChannelListWidth(CHANNEL_LIST_WIDTH.max)).toBe(
			CHANNEL_LIST_WIDTH.max,
		);
	});

	it("clamps below min and above max", () => {
		expect(clampChannelListWidth(10)).toBe(CHANNEL_LIST_WIDTH.min);
		expect(clampChannelListWidth(999)).toBe(CHANNEL_LIST_WIDTH.max);
	});

	it("falls back for non-finite input", () => {
		expect(clampChannelListWidth(Number.NaN)).toBe(CHANNEL_LIST_WIDTH.default);
		expect(clampChannelListWidth(Number.POSITIVE_INFINITY)).toBe(
			CHANNEL_LIST_WIDTH.default,
		);
	});

	it("rounds to whole pixels", () => {
		expect(clampChannelListWidth(200.6)).toBe(201);
	});
});

describe("clampMemberListWidth", () => {
	it("keeps values inside the member list range", () => {
		expect(clampMemberListWidth(240)).toBe(240);
		expect(clampMemberListWidth(MEMBER_LIST_WIDTH.min)).toBe(
			MEMBER_LIST_WIDTH.min,
		);
		expect(clampMemberListWidth(MEMBER_LIST_WIDTH.max)).toBe(
			MEMBER_LIST_WIDTH.max,
		);
	});

	it("clamps below min and above max", () => {
		expect(clampMemberListWidth(10)).toBe(MEMBER_LIST_WIDTH.min);
		expect(clampMemberListWidth(999)).toBe(MEMBER_LIST_WIDTH.max);
	});

	it("falls back for non-finite input", () => {
		expect(clampMemberListWidth(Number.NaN)).toBe(MEMBER_LIST_WIDTH.default);
	});
});

describe("parseMembersCollapsed", () => {
	it("accepts only true", () => {
		expect(parseMembersCollapsed(true)).toBe(true);
		expect(parseMembersCollapsed(false)).toBe(false);
		expect(parseMembersCollapsed("true")).toBe(false);
		expect(parseMembersCollapsed(1)).toBe(false);
		expect(parseMembersCollapsed(null)).toBe(false);
	});
});

describe("parseFriendsTab", () => {
	it("keeps known tabs and defaults the rest", () => {
		expect(parseFriendsTab("pending")).toBe("pending");
		expect(parseFriendsTab("blocked")).toBe("blocked");
		expect(parseFriendsTab("nope")).toBe(DEFAULT_FRIENDS_TAB);
		expect(parseFriendsTab(null)).toBe(DEFAULT_FRIENDS_TAB);
	});
});

describe("parseSettingsPage", () => {
	it("keeps known pages and defaults the rest", () => {
		expect(parseSettingsPage("appearance")).toBe("appearance");
		expect(parseSettingsPage("voice")).toBe("voice");
		expect(parseSettingsPage("profile")).toBe("account");
		expect(parseSettingsPage(42)).toBe("account");
	});
});

describe("migrateLegacyPrefKeys", () => {
	beforeEach(() => {
		for (const key of Object.values(PREFS_KEY)) {
			localStorage.removeItem(key);
		}
		localStorage.removeItem("stoat.prefs.channelListWidth");
		localStorage.removeItem("stoat.prefs.memberListWidth");
		localStorage.removeItem("stoat.prefs.membersCollapsed");
	});

	it("copies legacy panel keys into the namespaced prefix", () => {
		localStorage.setItem("stoat.prefs.membersCollapsed", "true");
		localStorage.setItem("stoat.prefs.channelListWidth", "320");
		migrateLegacyPrefKeys();
		expect(localStorage.getItem(PREFS_KEY.membersCollapsed)).toBe("true");
		expect(localStorage.getItem(PREFS_KEY.channelListWidth)).toBe("320");
		expect(localStorage.getItem("stoat.prefs.membersCollapsed")).toBeNull();
		expect(localStorage.getItem("stoat.prefs.channelListWidth")).toBeNull();
	});

	it("does not overwrite an existing namespaced value", () => {
		localStorage.setItem(PREFS_KEY.channelListWidth, "200");
		localStorage.setItem("stoat.prefs.channelListWidth", "320");
		migrateLegacyPrefKeys();
		expect(localStorage.getItem(PREFS_KEY.channelListWidth)).toBe("200");
		expect(localStorage.getItem("stoat.prefs.channelListWidth")).toBe("320");
	});
});

describe("prefs atoms persist", () => {
	beforeEach(() => {
		for (const key of Object.values(PREFS_KEY)) {
			localStorage.removeItem(key);
		}
		const store = getDefaultStore();
		store.set(channelListWidthAtom, CHANNEL_LIST_WIDTH.default);
		store.set(membersCollapsedAtom, false);
		store.set(friendsTabAtom, DEFAULT_FRIENDS_TAB);
		store.set(settingsPageAtom, "account");
	});

	it("writes friends tab and settings page to localStorage", () => {
		const store = getDefaultStore();
		store.set(friendsTabAtom, "blocked");
		store.set(settingsPageAtom, "voice");
		expect(JSON.parse(localStorage.getItem(PREFS_KEY.friendsTab) ?? "")).toBe(
			"blocked",
		);
		expect(JSON.parse(localStorage.getItem(PREFS_KEY.settingsPage) ?? "")).toBe(
			"voice",
		);
		expect(store.get(friendsTabAtom)).toBe("blocked");
		expect(store.get(settingsPageAtom)).toBe("voice");
	});

	it("clamps channel width on write", () => {
		const store = getDefaultStore();
		store.set(channelListWidthAtom, 12);
		expect(store.get(channelListWidthAtom)).toBe(CHANNEL_LIST_WIDTH.min);
		expect(
			JSON.parse(localStorage.getItem(PREFS_KEY.channelListWidth) ?? ""),
		).toBe(CHANNEL_LIST_WIDTH.min);
	});

	it("persists voice audio prefs and call split ratio", () => {
		const store = getDefaultStore();
		store.set(voiceAudioPrefsAtom, { deafen: true, micOn: false });
		store.set(channelCallSplitAtom, 0.55);
		expect(store.get(voiceAudioPrefsAtom)).toMatchObject({
			deafen: true,
			micOn: false,
			noiseSuppression: "enhanced",
		});
		expect(store.get(channelCallSplitAtom)).toBe(0.55);
	});
});

describe("parseVoiceAudioPrefs", () => {
	it("defaults to RNNoise-enhanced mic-on", () => {
		expect(parseVoiceAudioPrefs(undefined)).toEqual(DEFAULT_VOICE_AUDIO_PREFS);
	});
});

describe("clampChannelCallSplit", () => {
	it("clamps the call pane ratio", () => {
		expect(clampChannelCallSplit(0.4)).toBe(0.4);
		expect(clampChannelCallSplit(0.01)).toBe(CHANNEL_CALL_SPLIT.min);
		expect(clampChannelCallSplit(0.99)).toBe(CHANNEL_CALL_SPLIT.max);
	});
});
