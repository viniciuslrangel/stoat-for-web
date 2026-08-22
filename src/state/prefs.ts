import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import {
	DEFAULT_USER_SETTINGS_PAGE,
	isUserSettingsPageId,
	type UserSettingsPageId,
} from "@/components/settings/userSettingsPages";
import type { FriendsTab } from "@/hooks/friends-snapshots";
import {
	DEFAULT_SCREEN_SHARE_LISTENER_PREFS,
	parseScreenShareListenerPrefs,
	type ScreenShareListenerPrefs,
	withScreenShareMuted,
	withScreenShareVolume,
} from "@/lib/voice/screen-share-listener";
import {
	DEFAULT_SCREEN_SHARE_QUALITY,
	parseScreenShareQualityName,
	type ScreenShareQualityName,
} from "@/lib/voice/screen-share-profile";
import {
	DEFAULT_VOICE_AUDIO_PREFS,
	type NoiseSuppressionMode,
	type VoiceAudioPrefs,
} from "@/lib/voice/types";

/**
 * Client UI preferences (Jotai + localStorage).
 *
 * Keys (JSON via atomWithStorage unless noted):
 * - stoat.web.prefs.channelListWidth   number px (clamped)
 * - stoat.web.prefs.memberListWidth    number px (clamped)
 * - stoat.web.prefs.membersCollapsed   boolean
 * - stoat.web.prefs.friendsTab         FriendsTab
 * - stoat.web.prefs.settingsPage       UserSettingsPageId
 * - stoat.web.prefs.theme              plain string via next-themes (not Jotai)
 * - stoat.web.prefs.voiceAudio         VoiceAudioPrefs JSON
 * - stoat.web.prefs.channelCallSplit   number 0–1 (call pane fraction)
 *
 * Secrets and session tokens do not belong here (see session-persist).
 * Panel resize/collapse consumers import the width/collapsed atoms from this module.
 */

export const PREFS_KEY = {
	channelListWidth: "stoat.web.prefs.channelListWidth",
	memberListWidth: "stoat.web.prefs.memberListWidth",
	membersCollapsed: "stoat.web.prefs.membersCollapsed",
	friendsTab: "stoat.web.prefs.friendsTab",
	settingsPage: "stoat.web.prefs.settingsPage",
	theme: "stoat.web.prefs.theme",
	voiceAudio: "stoat.web.prefs.voiceAudio",
	channelCallSplit: "stoat.web.prefs.channelCallSplit",
	screenShareListener: "stoat.web.prefs.screenShareListener",
	screenShareQuality: "stoat.web.prefs.screenShareQuality",
} as const;

/** @deprecated Legacy keys from an early panels draft; migrate once then drop. */
const LEGACY_PREFS_KEY = {
	channelListWidth: "stoat.prefs.channelListWidth",
	memberListWidth: "stoat.prefs.memberListWidth",
	membersCollapsed: "stoat.prefs.membersCollapsed",
} as const;

export const CHANNEL_LIST_WIDTH = {
	min: 180,
	max: 400,
	default: 248,
} as const;

export const MEMBER_LIST_WIDTH = {
	min: 180,
	max: 360,
	default: 240,
} as const;

export const DEFAULT_FRIENDS_TAB: FriendsTab = "online";

const STORAGE_OPTS = { getOnInit: true } as const;

function readRaw(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeRaw(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* quota / private mode */
	}
}

function removeRaw(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		/* ignore */
	}
}

/** One-shot move from stoat.prefs.* → stoat.web.prefs.* when the new key is empty. */
function migrateLegacyKey(nextKey: string, legacyKey: string): void {
	if (readRaw(nextKey) !== null) {
		return;
	}
	const legacy = readRaw(legacyKey);
	if (legacy === null) {
		return;
	}
	writeRaw(nextKey, legacy);
	removeRaw(legacyKey);
}

export function clampChannelListWidth(value: number): number {
	if (!Number.isFinite(value)) {
		return CHANNEL_LIST_WIDTH.default;
	}
	return Math.min(
		CHANNEL_LIST_WIDTH.max,
		Math.max(CHANNEL_LIST_WIDTH.min, Math.round(value)),
	);
}

export function clampMemberListWidth(value: number): number {
	if (!Number.isFinite(value)) {
		return MEMBER_LIST_WIDTH.default;
	}
	return Math.min(
		MEMBER_LIST_WIDTH.max,
		Math.max(MEMBER_LIST_WIDTH.min, Math.round(value)),
	);
}

export function parseMembersCollapsed(value: unknown): boolean {
	return value === true;
}

export function parseFriendsTab(value: unknown): FriendsTab {
	if (
		value === "online" ||
		value === "all" ||
		value === "pending" ||
		value === "blocked"
	) {
		return value;
	}
	return DEFAULT_FRIENDS_TAB;
}

export function parseSettingsPage(value: unknown): UserSettingsPageId {
	if (typeof value === "string" && isUserSettingsPageId(value)) {
		return value;
	}
	return DEFAULT_USER_SETTINGS_PAGE;
}

/** Move early `stoat.prefs.*` values into `stoat.web.prefs.*` when missing. */
export function migrateLegacyPrefKeys(): void {
	migrateLegacyKey(
		PREFS_KEY.channelListWidth,
		LEGACY_PREFS_KEY.channelListWidth,
	);
	migrateLegacyKey(PREFS_KEY.memberListWidth, LEGACY_PREFS_KEY.memberListWidth);
	migrateLegacyKey(
		PREFS_KEY.membersCollapsed,
		LEGACY_PREFS_KEY.membersCollapsed,
	);
}

migrateLegacyPrefKeys();

const rawChannelListWidthAtom = atomWithStorage<number>(
	PREFS_KEY.channelListWidth,
	CHANNEL_LIST_WIDTH.default,
	undefined,
	STORAGE_OPTS,
);

const rawMemberListWidthAtom = atomWithStorage<number>(
	PREFS_KEY.memberListWidth,
	MEMBER_LIST_WIDTH.default,
	undefined,
	STORAGE_OPTS,
);

const rawMembersCollapsedAtom = atomWithStorage(
	PREFS_KEY.membersCollapsed,
	false,
	undefined,
	STORAGE_OPTS,
);

const rawFriendsTabAtom = atomWithStorage<FriendsTab>(
	PREFS_KEY.friendsTab,
	DEFAULT_FRIENDS_TAB,
	undefined,
	STORAGE_OPTS,
);

const rawSettingsPageAtom = atomWithStorage<UserSettingsPageId>(
	PREFS_KEY.settingsPage,
	DEFAULT_USER_SETTINGS_PAGE,
	undefined,
	STORAGE_OPTS,
);

export const channelListWidthAtom = atom(
	(get) => clampChannelListWidth(get(rawChannelListWidthAtom)),
	(_get, set, next: number) => {
		set(rawChannelListWidthAtom, clampChannelListWidth(next));
	},
);

export const memberListWidthAtom = atom(
	(get) => clampMemberListWidth(get(rawMemberListWidthAtom)),
	(_get, set, next: number) => {
		set(rawMemberListWidthAtom, clampMemberListWidth(next));
	},
);

export const membersCollapsedAtom = atom(
	(get) => parseMembersCollapsed(get(rawMembersCollapsedAtom)),
	(_get, set, next: boolean) => {
		set(rawMembersCollapsedAtom, parseMembersCollapsed(next));
	},
);

export const friendsTabAtom = atom(
	(get) => parseFriendsTab(get(rawFriendsTabAtom)),
	(_get, set, next: FriendsTab) => {
		set(rawFriendsTabAtom, parseFriendsTab(next));
	},
);

export const settingsPageAtom = atom(
	(get) => parseSettingsPage(get(rawSettingsPageAtom)),
	(_get, set, next: UserSettingsPageId) => {
		set(rawSettingsPageAtom, parseSettingsPage(next));
	},
);

export const CHANNEL_CALL_SPLIT = {
	min: 0.15,
	max: 0.85,
	default: 0.4,
} as const;

export function clampChannelCallSplit(value: number): number {
	if (!Number.isFinite(value)) {
		return CHANNEL_CALL_SPLIT.default;
	}
	return Math.min(
		CHANNEL_CALL_SPLIT.max,
		Math.max(CHANNEL_CALL_SPLIT.min, value),
	);
}

function isNoiseSuppressionMode(value: unknown): value is NoiseSuppressionMode {
	return value === "disabled" || value === "browser" || value === "enhanced";
}

export function parseVoiceAudioPrefs(value: unknown): VoiceAudioPrefs {
	const base = { ...DEFAULT_VOICE_AUDIO_PREFS };
	if (value === null || typeof value !== "object") {
		return base;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.micOn === "boolean") {
		base.micOn = record.micOn;
	}
	if (typeof record.deafen === "boolean") {
		base.deafen = record.deafen;
	}
	if (typeof record.echoCancellation === "boolean") {
		base.echoCancellation = record.echoCancellation;
	}
	if (typeof record.autoGainControl === "boolean") {
		base.autoGainControl = record.autoGainControl;
	}
	if (isNoiseSuppressionMode(record.noiseSuppression)) {
		base.noiseSuppression = record.noiseSuppression;
	}
	if (
		typeof record.outputVolume === "number" &&
		Number.isFinite(record.outputVolume)
	) {
		base.outputVolume = Math.min(3, Math.max(0, record.outputVolume));
	}
	return base;
}

const rawVoiceAudioAtom = atomWithStorage<VoiceAudioPrefs>(
	PREFS_KEY.voiceAudio,
	DEFAULT_VOICE_AUDIO_PREFS,
	undefined,
	STORAGE_OPTS,
);

const rawChannelCallSplitAtom = atomWithStorage<number>(
	PREFS_KEY.channelCallSplit,
	CHANNEL_CALL_SPLIT.default,
	undefined,
	STORAGE_OPTS,
);

export const voiceAudioPrefsAtom = atom(
	(get) => parseVoiceAudioPrefs(get(rawVoiceAudioAtom)),
	(get, set, patch: Partial<VoiceAudioPrefs>) => {
		const current = parseVoiceAudioPrefs(get(rawVoiceAudioAtom));
		set(rawVoiceAudioAtom, parseVoiceAudioPrefs({ ...current, ...patch }));
	},
);

export const channelCallSplitAtom = atom(
	(get) => clampChannelCallSplit(get(rawChannelCallSplitAtom)),
	(_get, set, next: number) => {
		set(rawChannelCallSplitAtom, clampChannelCallSplit(next));
	},
);

const rawScreenShareListenerAtom = atomWithStorage(
	PREFS_KEY.screenShareListener,
	DEFAULT_SCREEN_SHARE_LISTENER_PREFS,
	undefined,
	STORAGE_OPTS,
);

const rawScreenShareQualityAtom = atomWithStorage<ScreenShareQualityName>(
	PREFS_KEY.screenShareQuality,
	DEFAULT_SCREEN_SHARE_QUALITY,
	undefined,
	STORAGE_OPTS,
);

export const screenShareListenerPrefsAtom = atom(
	(get) => parseScreenShareListenerPrefs(get(rawScreenShareListenerAtom)),
	(
		get,
		set,
		next:
			| ScreenShareListenerPrefs
			| ((current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs),
	) => {
		const current = parseScreenShareListenerPrefs(
			get(rawScreenShareListenerAtom),
		);
		const value = typeof next === "function" ? next(current) : next;
		set(rawScreenShareListenerAtom, parseScreenShareListenerPrefs(value));
	},
);

export const screenShareQualityAtom = atom(
	(get) => parseScreenShareQualityName(get(rawScreenShareQualityAtom)),
	(_get, set, next: ScreenShareQualityName) => {
		set(rawScreenShareQualityAtom, parseScreenShareQualityName(next));
	},
);

export function setScreenShareMutedPref(
	identity: string,
	muted: boolean,
): (current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs {
	return (current) => withScreenShareMuted(current, identity, muted);
}

export function setScreenShareVolumePref(
	identity: string,
	volume: number,
): (current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs {
	return (current) => withScreenShareVolume(current, identity, volume);
}
