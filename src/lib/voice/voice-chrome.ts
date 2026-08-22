import type { VoiceSessionSnapshot } from "@/lib/voice/types";

/**
 * Discord-like voice chrome presentation.
 *
 * Floating / split call stage is only for video (camera or screenshare,
 * local or remote). Audio-only connection status and mute/deafen live in
 * the bottom-left user tray.
 */
export type VoiceChrome =
	| { kind: "idle" }
	| {
			kind: "prejoin";
			channelId: string;
			channelName: string;
	  }
	| {
			kind: "in_call";
			channelId: string;
			channelName: string;
			/** Show the large floating / split voice stage. */
			showStage: boolean;
	  };

export function isVoiceSessionActive(
	phase: VoiceSessionSnapshot["phase"],
): boolean {
	return (
		phase === "connecting" || phase === "connected" || phase === "reconnecting"
	);
}

export function presentVoiceChrome(input: {
	session: VoiceSessionSnapshot;
	viewingVoiceChannel: { id: string; name: string } | null;
	/** Dev / visual-proof override when no real video track exists yet. */
	forceVideoStage?: boolean;
}): VoiceChrome {
	const { session, viewingVoiceChannel, forceVideoStage = false } = input;

	if (session.channelId && isVoiceSessionActive(session.phase)) {
		return {
			kind: "in_call",
			channelId: session.channelId,
			channelName: session.channelName ?? "Voice",
			showStage: session.hasVideoStage || forceVideoStage,
		};
	}

	if (viewingVoiceChannel) {
		return {
			kind: "prejoin",
			channelId: viewingVoiceChannel.id,
			channelName: viewingVoiceChannel.name,
		};
	}

	return { kind: "idle" };
}
