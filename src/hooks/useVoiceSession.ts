import { getDefaultStore } from "jotai";
import { useEffect, useSyncExternalStore } from "react";

import type { VoiceSessionSnapshot } from "@/lib/voice/types";
import {
	bindScreenSharePrefs,
	bindVoicePrefs,
} from "@/lib/voice/voice-prefs-bridge";
import { voiceRuntime } from "@/lib/voice/voice-runtime";
import {
	screenShareListenerPrefsAtom,
	screenShareQualityAtom,
	setScreenShareMutedPref,
	setScreenShareVolumePref,
	voiceAudioPrefsAtom,
} from "@/state/prefs";

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
		setScreenShareMuted: (identity: string, muted: boolean) => {
			const store = getDefaultStore();
			store.set(
				screenShareListenerPrefsAtom,
				setScreenShareMutedPref(identity, muted),
			);
			voiceRuntime.refreshFromPrefs();
		},
		setScreenShareVolume: (identity: string, volume: number) => {
			const store = getDefaultStore();
			store.set(
				screenShareListenerPrefsAtom,
				setScreenShareVolumePref(identity, volume),
			);
			voiceRuntime.refreshFromPrefs();
		},
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
		bindScreenSharePrefs(
			() => store.get(screenShareListenerPrefsAtom),
			(next) => {
				store.set(screenShareListenerPrefsAtom, next);
			},
			() => store.get(screenShareQualityAtom),
		);
		const unsubAudio = store.sub(voiceAudioPrefsAtom, () => {
			voiceRuntime.refreshFromPrefs();
		});
		const unsubShare = store.sub(screenShareListenerPrefsAtom, () => {
			voiceRuntime.refreshFromPrefs();
		});
		const unsubQuality = store.sub(screenShareQualityAtom, () => {
			voiceRuntime.refreshFromPrefs();
		});
		return () => {
			unsubAudio();
			unsubShare();
			unsubQuality();
		};
	}, []);
}
