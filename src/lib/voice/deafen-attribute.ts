import type { LocalParticipant, Participant } from "livekit-client";

export const LIVEKIT_DEAFEN_ATTRIBUTE = "deafen";

export function deafenAttributePayload(
	deafened: boolean,
): Record<string, string> {
	return { [LIVEKIT_DEAFEN_ATTRIBUTE]: deafened ? "true" : "" };
}

export function participantIsDeafened(participant: Participant): boolean {
	return participant.attributes[LIVEKIT_DEAFEN_ATTRIBUTE] === "true";
}

export function canPublishDeafenAttribute(
	participant: LocalParticipant,
): boolean {
	return participant.permissions?.canUpdateMetadata === true;
}

export function isOwnMetadataPermissionError(error: unknown): boolean {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: String(error);
	return /update own metadata/i.test(message);
}
