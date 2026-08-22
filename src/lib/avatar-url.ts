/**
 * Autumn CDN avatar/file URLs.
 *
 * Static resize path (`/{tag}/{id}`) converts GIFs to a still frame.
 * Animated avatars need `/{tag}/{id}/original` (stoat.js createFileURL(true)).
 */

function trimSlash(value: string): string {
	return value.replace(/\/$/, "");
}

export function isGifContentType(value: unknown): boolean {
	return typeof value === "string" && value.toLowerCase() === "image/gif";
}

export type AutumnFileUrlInput = {
	autumnBase: string;
	tag: string;
	fileId: string;
	/** MIME from Autumn/API. When image/gif, append /original. */
	contentType?: string | null;
	/** Force /original (caller already knows the file is animated). */
	animated?: boolean;
};

/**
 * Build an Autumn file URL. Use animated/gif so GIFs keep playing.
 */
export function autumnFileUrl(input: AutumnFileUrlInput): string {
	const base = `${trimSlash(input.autumnBase)}/${input.tag}/${input.fileId}`;
	const keepAnimation =
		input.animated === true || isGifContentType(input.contentType);
	return keepAnimation ? `${base}/original` : base;
}

/**
 * If `url` is an Autumn `/{tag}/{id}` path and content is a GIF (or animated
 * is forced), rewrite to `.../original`. Leaves unrelated URLs alone.
 */
export function withAutumnOriginal(
	url: string,
	options?: { contentType?: string | null; animated?: boolean },
): string {
	const keepAnimation =
		options?.animated === true || isGifContentType(options?.contentType);
	if (!keepAnimation) {
		return url;
	}
	try {
		const parsed = new URL(url);
		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length === 2) {
			parsed.pathname = `/${parts[0]}/${parts[1]}/original`;
			return parsed.toString();
		}
		if (parts.length >= 3 && parts[parts.length - 1] === "original") {
			return url;
		}
	} catch {
		return url;
	}
	return url;
}

type SdkAvatarSource = {
	animatedAvatarURL?: string;
	avatarURL?: string;
};

/**
 * Read a GIF-safe avatar URL from a stoat.js User (or similar).
 * Prefer animatedAvatarURL. Never return an SDK object.
 */
export function userAvatarUrlFromSdk(
	user: SdkAvatarSource,
): string | undefined {
	try {
		const animated = user.animatedAvatarURL;
		if (typeof animated === "string" && animated.length > 0) {
			return animated;
		}
	} catch {
		/* getter can throw on incomplete hydrate */
	}
	try {
		const staticUrl = user.avatarURL;
		if (typeof staticUrl === "string" && staticUrl.length > 0) {
			return staticUrl;
		}
	} catch {
		/* ignore */
	}
	return undefined;
}

export function avatarUrlFromRestFile(
	avatar: unknown,
	userId: string,
	autumnBase: string | null,
	apiBase: string,
): string {
	if (avatar !== null && typeof avatar === "object") {
		const record = avatar as Record<string, unknown>;
		const fileId =
			typeof record._id === "string" && record._id.trim().length > 0
				? record._id.trim()
				: null;
		const tag =
			typeof record.tag === "string" && record.tag.trim().length > 0
				? record.tag.trim()
				: "avatars";
		const contentType =
			typeof record.content_type === "string"
				? record.content_type
				: typeof record.contentType === "string"
					? record.contentType
					: null;
		if (fileId && autumnBase) {
			return autumnFileUrl({
				autumnBase,
				tag,
				fileId,
				contentType,
			});
		}
	}
	return `${trimSlash(apiBase)}/users/${userId}/default_avatar`;
}
