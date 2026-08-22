import { getDefaultStore } from "jotai";
import { useEffect, useSyncExternalStore } from "react";

import type { VoiceSessionSnapshot } from "@/lib/voice/types";
import { bindVoicePrefs } from "@/lib/voice/voice-prefs-bridge";
import { voiceRuntime } from "@/lib/voice/voice-runtime";
import { voiceAudioPrefsAtom } from "@/state/prefs";

export function useVoiceSession(): VoiceSessionSnapshot {
	return useSyncExternalStore(
		(onStoreChange) => voiceRuntime.subscribe(onStoreChange),
		() => voiceRuntime.getSnapshot(),
		() => voiceRuntime.getSnapshot(),
	);
}

export function useVoiceActions() {
	return {
		connect: (channelId: string) => voiceRuntime.connect(channelId),
		disconnect: () => voiceRuntime.disconnect(),
		toggleMute: () => voiceRuntime.toggleMute(),
		toggleDeafen: () => voiceRuntime.toggleDeafen(),
		toggleScreenshare: () => voiceRuntime.toggleScreenshare(),
		resumeWatching: (participantSid: string) =>
			voiceRuntime.resumeWatching(participantSid),
		stopWatching: (participantSid: string) =>
			voiceRuntime.stopWatching(participantSid),
	};
}

/** Bind jotai voice prefs into the runtime (must mount once under AppProviders). */
export function useVoicePrefsBridge(): void {
	useEffect(() => {
		const store = getDefaultStore();
		bindVoicePrefs(
			() => store.get(voiceAudioPrefsAtom),
			(patch) => {
				store.set(voiceAudioPrefsAtom, patch);
			},
		);
		return store.sub(voiceAudioPrefsAtom, () => {
			voiceRuntime.refreshFromPrefs();
		});
	}, []);
}
