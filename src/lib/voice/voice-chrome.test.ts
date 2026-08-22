import { describe, expect, it } from "vite-plus/test";

import {
	IDLE_VOICE_SESSION,
	type VoiceSessionSnapshot,
} from "@/lib/voice/types";
import { presentVoiceChrome } from "@/lib/voice/voice-chrome";

function session(patch: Partial<VoiceSessionSnapshot>): VoiceSessionSnapshot {
	return { ...IDLE_VOICE_SESSION, ...patch };
}

describe("presentVoiceChrome", () => {
	it("is idle when not in a call and not viewing voice", () => {
		expect(
			presentVoiceChrome({
				session: IDLE_VOICE_SESSION,
				viewingVoiceChannel: null,
			}),
		).toEqual({ kind: "idle" });
	});

	it("is prejoin when viewing a voice channel without a session", () => {
		expect(
			presentVoiceChrome({
				session: IDLE_VOICE_SESSION,
				viewingVoiceChannel: { id: "c1", name: "General" },
			}),
		).toEqual({
			kind: "prejoin",
			channelId: "c1",
			channelName: "General",
		});
	});

	it("hides the floating stage for audio-only in-call", () => {
		expect(
			presentVoiceChrome({
				session: session({
					phase: "connected",
					channelId: "c1",
					channelName: "General",
					hasVideoStage: false,
				}),
				viewingVoiceChannel: { id: "c1", name: "General" },
			}),
		).toEqual({
			kind: "in_call",
			channelId: "c1",
			channelName: "General",
			showStage: false,
		});
	});

	it("shows the floating stage when any video track is active", () => {
		expect(
			presentVoiceChrome({
				session: session({
					phase: "connected",
					channelId: "c1",
					channelName: "General",
					hasVideoStage: true,
					cameraEnabled: true,
				}),
				viewingVoiceChannel: null,
			}),
		).toEqual({
			kind: "in_call",
			channelId: "c1",
			channelName: "General",
			showStage: true,
		});
	});

	it("honors forceVideoStage for visual proof without a real track", () => {
		const chrome = presentVoiceChrome({
			session: session({
				phase: "connected",
				channelId: "c1",
				channelName: "General",
				hasVideoStage: false,
			}),
			viewingVoiceChannel: { id: "c1", name: "General" },
			forceVideoStage: true,
		});
		expect(chrome).toMatchObject({ kind: "in_call", showStage: true });
	});
});
