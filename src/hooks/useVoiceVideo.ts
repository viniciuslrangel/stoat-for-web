import { useSyncExternalStore } from "react";
import { voiceRuntime } from "@/lib/voice/voice-runtime";
import type { VoiceVideoSnapshot } from "@/lib/voice/voice-video-types";

export function useVoiceVideo(): VoiceVideoSnapshot {
	return useSyncExternalStore(
		(listener) => voiceRuntime.subscribeVideo(listener),
		() => voiceRuntime.getVideoSnapshot(),
		() => voiceRuntime.getVideoSnapshot(),
	);
}
