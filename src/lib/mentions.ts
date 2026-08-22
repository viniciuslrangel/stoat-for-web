/**
 * Stoat message mention syntax (from old Solid client remarkMentions / codeMirrorWidgets):
 *   <@ULID> user
 *   <#ULID> channel
 *   <%ULID> role
 *   @everyone / @online
 * Custom emoji :ULID: is recognized but left for a later renderer.
 */

const ULID = "[0-9A-HJKMNPQRSTVWXYZ]{26}";

/** Global matcher; capture groups identify kind. */
const MENTION_RE = new RegExp(
	`(<@(${ULID})>)|(<#(${ULID})>)|(<%(${ULID})>)|(@everyone)|(@online)|(:(${ULID}):)`,
	"gi",
);

export type ContentToken =
	| { type: "text"; value: string }
	| { type: "user"; id: string }
	| { type: "channel"; id: string }
	| { type: "role"; id: string }
	| { type: "everyone" }
	| { type: "online" }
	| { type: "emoji"; id: string };

export type ResolvedUserMention = {
	id: string;
	/** Display label without leading @ */
	name: string;
	known: boolean;
};

export type UserNameLookup = ReadonlyMap<string, string>;

export function tokenizeMentions(content: string): ContentToken[] {
	if (content.length === 0) {
		return [{ type: "text", value: "" }];
	}

	const tokens: ContentToken[] = [];
	let lastIndex = 0;
	MENTION_RE.lastIndex = 0;

	for (const match of content.matchAll(MENTION_RE)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			tokens.push({ type: "text", value: content.slice(lastIndex, index) });
		}

		const [
			,
			_userFull,
			userId,
			_channelFull,
			channelId,
			_roleFull,
			roleId,
			everyone,
			online,
			_emojiFull,
			emojiId,
		] = match;

		if (userId) {
			tokens.push({ type: "user", id: userId.toUpperCase() });
		} else if (channelId) {
			tokens.push({ type: "channel", id: channelId.toUpperCase() });
		} else if (roleId) {
			tokens.push({ type: "role", id: roleId.toUpperCase() });
		} else if (everyone) {
			tokens.push({ type: "everyone" });
		} else if (online) {
			tokens.push({ type: "online" });
		} else if (emojiId) {
			tokens.push({ type: "emoji", id: emojiId.toUpperCase() });
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < content.length) {
		tokens.push({ type: "text", value: content.slice(lastIndex) });
	}

	if (tokens.length === 0) {
		return [{ type: "text", value: content }];
	}

	return tokens;
}

export function resolveUserMention(
	id: string,
	usersById: UserNameLookup,
): ResolvedUserMention {
	const name = usersById.get(id) ?? usersById.get(id.toUpperCase());
	if (typeof name === "string" && name.trim().length > 0) {
		return { id, name: name.trim(), known: true };
	}
	return { id, name: "Unknown user", known: false };
}

export function usersByIdFromMessages(
	messages: readonly { authorId: string | null; authorName: string }[],
): Map<string, string> {
	const map = new Map<string, string>();
	for (const message of messages) {
		if (!message.authorId) {
			continue;
		}
		const name = message.authorName.trim();
		if (name.length === 0 || name === "Unknown" || name === "Unknown user") {
			continue;
		}
		map.set(message.authorId, name);
	}
	return map;
}

export function mergeUserNameLookups(
	...lookups: readonly (UserNameLookup | undefined)[]
): Map<string, string> {
	const map = new Map<string, string>();
	for (const lookup of lookups) {
		if (!lookup) {
			continue;
		}
		for (const [id, name] of lookup) {
			if (name.trim().length > 0) {
				map.set(id, name.trim());
			}
		}
	}
	return map;
}
