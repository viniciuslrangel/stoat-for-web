import { describe, expect, it } from "vite-plus/test";

import {
	applyScreenShareWatchAction,
	deriveVoiceVideoSnapshot,
	isWatchingScreenShare,
	SCREEN_SHARE_SOURCES,
} from "@/lib/voice/voice-video-types";

describe("screen share watch state", () => {
	it("adds and removes participant SIDs without mutating the source set", () => {
		const source = new Set(["participant-1"]);
		const watching = applyScreenShareWatchAction(
			source,
			"participant-2",
			"resume",
		);

		expect([...watching]).toEqual(["participant-1", "participant-2"]);
		expect([...source]).toEqual(["participant-1"]);
		expect(isWatchingScreenShare(watching, "participant-2")).toBe(true);

		const stopped = applyScreenShareWatchAction(
			watching,
			"participant-1",
			"stop",
		);
		expect([...stopped]).toEqual(["participant-2"]);
	});

	it("removes watch state when a participant's share ends", () => {
		const watching = applyScreenShareWatchAction(
			new Set<string>(),
			"participant-1",
			"resume",
		);
		expect(
			applyScreenShareWatchAction(watching, "participant-1", "remove"),
		).toEqual(new Set());
	});

	it("rejects late screen-share audio after stop watching", () => {
		const watching = applyScreenShareWatchAction(
			new Set<string>(),
			"participant-1",
			"resume",
		);
		const stopped = applyScreenShareWatchAction(
			watching,
			"participant-1",
			"stop",
		);

		expect(isWatchingScreenShare(stopped, "participant-1")).toBe(false);
	});

	it("pairs screen video and screen audio subscriptions", () => {
		expect(SCREEN_SHARE_SOURCES).toHaveLength(2);
		expect(new Set(SCREEN_SHARE_SOURCES)).toEqual(
			new Set(["screen_share", "screen_share_audio"]),
		);
	});
});

describe("deriveVoiceVideoSnapshot", () => {
	it("keeps descriptor state and local publication flags together", () => {
		const surface = {
			id: "participant-1:screenshare",
			participantSid: "participant-1",
			participantIdentity: "alice",
			participantName: "Alice",
			source: "screenshare" as const,
			local: false,
			isLive: false,
			isWatching: false,
			mediaGeneration: 1,
		};

		expect(
			deriveVoiceVideoSnapshot({
				surfaces: [surface],
				localCameraEnabled: false,
				localScreenshareEnabled: false,
			}),
		).toEqual({
			surfaces: [surface],
			localCameraEnabled: false,
			localScreenshareEnabled: false,
		});
	});
});
