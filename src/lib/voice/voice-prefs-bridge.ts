import {
	DEFAULT_VOICE_AUDIO_PREFS,
	type VoiceAudioPrefs,
} from "@/lib/voice/types";

let reader: () => VoiceAudioPrefs = () => DEFAULT_VOICE_AUDIO_PREFS;
let writer: (patch: Partial<VoiceAudioPrefs>) => void = () => {};

export function bindVoicePrefs(
	nextReader: () => VoiceAudioPrefs,
	nextWriter: (patch: Partial<VoiceAudioPrefs>) => void,
): void {
	reader = nextReader;
	writer = nextWriter;
}

export function readVoicePrefs(): VoiceAudioPrefs {
	return reader();
}

export function patchVoicePrefs(patch: Partial<VoiceAudioPrefs>): void {
	writer(patch);
}
