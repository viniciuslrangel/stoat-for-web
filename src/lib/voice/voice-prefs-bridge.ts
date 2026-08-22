import {
	DEFAULT_SCREEN_SHARE_LISTENER_PREFS,
	type ScreenShareListenerPrefs,
} from "@/lib/voice/screen-share-listener";
import {
	DEFAULT_SCREEN_SHARE_QUALITY,
	type ScreenShareQualityName,
} from "@/lib/voice/screen-share-profile";
import {
	DEFAULT_VOICE_AUDIO_PREFS,
	type VoiceAudioPrefs,
} from "@/lib/voice/types";

let reader: () => VoiceAudioPrefs = () => DEFAULT_VOICE_AUDIO_PREFS;
let writer: (patch: Partial<VoiceAudioPrefs>) => void = () => {};
let shareListenerReader: () => ScreenShareListenerPrefs = () =>
	DEFAULT_SCREEN_SHARE_LISTENER_PREFS;
let shareListenerWriter: (
	next:
		| ScreenShareListenerPrefs
		| ((current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs),
) => void = () => {};
let qualityReader: () => ScreenShareQualityName = () =>
	DEFAULT_SCREEN_SHARE_QUALITY;

export function bindVoicePrefs(
	nextReader: () => VoiceAudioPrefs,
	nextWriter: (patch: Partial<VoiceAudioPrefs>) => void,
): void {
	reader = nextReader;
	writer = nextWriter;
}

export function bindScreenSharePrefs(
	nextListenerReader: () => ScreenShareListenerPrefs,
	nextListenerWriter: (
		next:
			| ScreenShareListenerPrefs
			| ((current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs),
	) => void,
	nextQualityReader: () => ScreenShareQualityName,
): void {
	shareListenerReader = nextListenerReader;
	shareListenerWriter = nextListenerWriter;
	qualityReader = nextQualityReader;
}

export function readVoicePrefs(): VoiceAudioPrefs {
	return reader();
}

export function patchVoicePrefs(patch: Partial<VoiceAudioPrefs>): void {
	writer(patch);
}

export function readScreenShareListenerPrefs(): ScreenShareListenerPrefs {
	return shareListenerReader();
}

export function updateScreenShareListenerPrefs(
	next:
		| ScreenShareListenerPrefs
		| ((current: ScreenShareListenerPrefs) => ScreenShareListenerPrefs),
): void {
	shareListenerWriter(next);
}

export function readScreenShareQuality(): ScreenShareQualityName {
	return qualityReader();
}
