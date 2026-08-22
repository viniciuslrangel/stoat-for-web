export const VOICE_PHASES = [
	"ready",
	"connecting",
	"connected",
	"reconnecting",
	"disconnected",
] as const;

export type VoicePhase = (typeof VOICE_PHASES)[number];

export type NoiseSuppressionMode = "disabled" | "browser" | "enhanced";

export type VoiceAudioPrefs = {
	micOn: boolean;
	deafen: boolean;
	echoCancellation: boolean;
	autoGainControl: boolean;
	noiseSuppression: NoiseSuppressionMode;
	outputVolume: number;
};

export type VoiceRoomParticipantSnapshot = {
	identity: string;
	name: string;
	isLocal: boolean;
	micMuted: boolean;
	deafened: boolean;
	speaking: boolean;
};

export type VoiceSessionSnapshot = {
	phase: VoicePhase;
	channelId: string | null;
	channelName: string | null;
	localIdentity: string | null;
	error: string | null;
	/** Effective mic UI: prefs.micOn && !prefs.deafen */
	microphone: boolean;
	deafen: boolean;
	canSpeak: boolean;
	/** Local camera publication is live. */
	cameraEnabled: boolean;
	/** Local screenshare publication is live. */
	screenshareEnabled: boolean;
	/**
	 * True when the video snapshot has a local track or a remote share
	 * placeholder. Audio-only calls keep controls in the bottom-left tray.
	 */
	hasVideoStage: boolean;
	participants: readonly VoiceRoomParticipantSnapshot[];
};

export const DEFAULT_VOICE_AUDIO_PREFS: VoiceAudioPrefs = {
	micOn: true,
	deafen: false,
	echoCancellation: true,
	autoGainControl: true,
	noiseSuppression: "enhanced",
	outputVolume: 1,
};

export const IDLE_VOICE_SESSION: VoiceSessionSnapshot = {
	phase: "ready",
	channelId: null,
	channelName: null,
	localIdentity: null,
	error: null,
	microphone: true,
	deafen: false,
	canSpeak: true,
	cameraEnabled: false,
	screenshareEnabled: false,
	hasVideoStage: false,
	participants: [],
};
