import { type InviteCode, parseInviteCode } from "@/domain/ids";

const INVITE_IN_PATH = /(?:invite\/|stt\.gg\/)([a-zA-Z0-9]+)/i;

/**
 * Accept a bare invite code or a pasted invite / stt.gg link.
 * Returns null when nothing usable is present.
 */
export function extractInviteCode(raw: string): InviteCode | null {
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const pathMatch = INVITE_IN_PATH.exec(trimmed);
	if (pathMatch?.[1]) {
		try {
			return parseInviteCode(pathMatch[1]);
		} catch {
			return null;
		}
	}

	if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
		try {
			return parseInviteCode(trimmed);
		} catch {
			return null;
		}
	}

	return null;
}
