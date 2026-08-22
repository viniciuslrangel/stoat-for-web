import { Track } from "livekit-client";

export type VoiceVideoSource = "camera" | "screenshare";

export type VoiceVideoSurfaceDescriptor = {
	id: string;
	participantSid: string;
	participantIdentity: string;
	participantName: string;
	source: VoiceVideoSource;
	local: boolean;
	isLive: boolean;
	isWatching: boolean;
	mediaGeneration: number;
};

export type VoiceVideoSnapshot = {
	surfaces: readonly VoiceVideoSurfaceDescriptor[];
	localCameraEnabled: boolean;
	localScreenshareEnabled: boolean;
};

export type ScreenShareWatchAction = "resume" | "stop" | "remove";

export const SCREEN_SHARE_SOURCES = [
	Track.Source.ScreenShare,
	Track.Source.ScreenShareAudio,
] as const;

export const IDLE_VOICE_VIDEO: VoiceVideoSnapshot = {
	surfaces: [],
	localCameraEnabled: false,
	localScreenshareEnabled: false,
};

export function voiceVideoSurfaceId(
	participantSid: string,
	source: VoiceVideoSource,
): string {
	return `${participantSid}:${source}`;
}

export function applyScreenShareWatchAction(
	watching: ReadonlySet<string>,
	participantSid: string,
	action: ScreenShareWatchAction,
): Set<string> {
	const next = new Set(watching);
	if (action === "resume") {
		next.add(participantSid);
	} else {
		next.delete(participantSid);
	}
	return next;
}

export function isWatchingScreenShare(
	watching: ReadonlySet<string>,
	participantSid: string,
): boolean {
	return watching.has(participantSid);
}

export function deriveVoiceVideoSnapshot(input: {
	surfaces: readonly VoiceVideoSurfaceDescriptor[];
	localCameraEnabled: boolean;
	localScreenshareEnabled: boolean;
}): VoiceVideoSnapshot {
	return {
		surfaces: input.surfaces,
		localCameraEnabled: input.localCameraEnabled,
		localScreenshareEnabled: input.localScreenshareEnabled,
	};
}
