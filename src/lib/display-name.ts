import { shortUserLabel } from "@/lib/system-message";

/**
 * Prefer nickname, then profile display name, then username, then a short id.
 * Shared by member list, mentions, and message authors — keep one resolution order.
 */
export function displayNameForUser(input: {
	nickname?: string | null;
	displayName?: string | null;
	username?: string | null;
	userId?: string | null;
}): string {
	const nickname = asNonEmpty(input.nickname);
	if (nickname) {
		return nickname;
	}
	const displayName = asNonEmpty(input.displayName);
	if (displayName) {
		return displayName;
	}
	const username = asNonEmpty(input.username);
	if (username) {
		return username;
	}
	const userId = asNonEmpty(input.userId);
	if (userId) {
		return shortUserLabel(userId);
	}
	return "Unknown";
}

/** True when a snapshot label is a missing-user placeholder. */
export function isUnresolvedDisplayName(
	name: string,
	userId?: string | null,
): boolean {
	const trimmed = name.trim();
	if (
		trimmed.length === 0 ||
		trimmed === "Unknown" ||
		trimmed === "Unknown user"
	) {
		return true;
	}
	if (userId && trimmed === shortUserLabel(userId)) {
		return true;
	}
	return false;
}

/**
 * Prefer a hydrated lookup when the message snapshot still has a placeholder name.
 * Keeps masquerade / webhook / resolved author names intact.
 */
export function displayedAuthorName(
	message: { authorId: string | null; authorName: string },
	usersById: ReadonlyMap<string, string>,
): string {
	if (
		message.authorId &&
		isUnresolvedDisplayName(message.authorName, message.authorId)
	) {
		const mapped =
			usersById.get(message.authorId) ??
			usersById.get(message.authorId.toUpperCase());
		if (mapped && mapped.trim().length > 0) {
			return mapped.trim();
		}
	}
	return message.authorName;
}

function asNonEmpty(value: string | null | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}
