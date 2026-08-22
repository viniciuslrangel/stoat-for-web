/**
 * Message body parser extending mentions.
 * Parse order: fences/code → mentions → autolinks → text.
 * XSS-safe: structured tokens only; never HTML strings.
 */

import { type ContentToken, tokenizeMentions } from "@/lib/mentions";

const FENCE_RE = /^```([^\n`]*)\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;

/** http(s) URLs; trailing punctuation peeled after match. */
const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

const TRAILING_PUNCT = /[),.;:!?]+$/;

const IMAGE_EXT_RE =
	/\.(?:png|jpe?g|gif|webp|svg|avif|bmp)(?:\?[^#]*)?(?:#.*)?$/i;

export type MessageAttachmentSnapshot = {
	id: string;
	url: string;
	filename: string | null;
	contentType: string | null;
	kind: "image" | "file";
};

export type InlineToken =
	| ContentToken
	| { type: "link"; href: string; label: string }
	| { type: "image"; src: string; alt: string };

export type MessageContentBlock =
	| { type: "code"; language: string | null; value: string }
	| { type: "prose"; tokens: InlineToken[] };

export function isHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function looksLikeImageUrl(url: string): boolean {
	if (!isHttpUrl(url)) {
		return false;
	}
	try {
		const { pathname } = new URL(url);
		return IMAGE_EXT_RE.test(pathname);
	} catch {
		return false;
	}
}

function peelUrl(raw: string): { href: string; trailing: string } {
	let href = raw;
	let trailing = "";
	while (href.length > 0 && TRAILING_PUNCT.test(href)) {
		trailing = href.slice(-1) + trailing;
		href = href.slice(0, -1);
	}
	return { href, trailing };
}

export function tokenizeUrls(text: string): InlineToken[] {
	if (text.length === 0) {
		return [{ type: "text", value: "" }];
	}

	const tokens: InlineToken[] = [];
	let lastIndex = 0;
	URL_RE.lastIndex = 0;

	for (const match of text.matchAll(URL_RE)) {
		const index = match.index ?? 0;
		const raw = match[0];
		const { href, trailing } = peelUrl(raw);
		if (!isHttpUrl(href)) {
			continue;
		}

		if (index > lastIndex) {
			tokens.push({ type: "text", value: text.slice(lastIndex, index) });
		}

		if (looksLikeImageUrl(href)) {
			tokens.push({ type: "image", src: href, alt: href });
		} else {
			tokens.push({ type: "link", href, label: href });
		}

		if (trailing.length > 0) {
			tokens.push({ type: "text", value: trailing });
		}

		lastIndex = index + raw.length;
	}

	if (lastIndex < text.length) {
		tokens.push({ type: "text", value: text.slice(lastIndex) });
	}

	if (tokens.length === 0) {
		return [{ type: "text", value: text }];
	}

	return tokens;
}

function expandMentionTokens(tokens: ContentToken[]): InlineToken[] {
	const out: InlineToken[] = [];
	for (const token of tokens) {
		if (token.type === "text") {
			out.push(...tokenizeUrls(token.value));
		} else {
			out.push(token);
		}
	}
	return out;
}

function splitFences(content: string): MessageContentBlock[] {
	if (content.length === 0) {
		return [{ type: "prose", tokens: [{ type: "text", value: "" }] }];
	}

	const blocks: MessageContentBlock[] = [];
	let lastIndex = 0;
	FENCE_RE.lastIndex = 0;

	for (const match of content.matchAll(FENCE_RE)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			const prose = content.slice(lastIndex, index);
			blocks.push({
				type: "prose",
				tokens: expandMentionTokens(tokenizeMentions(prose)),
			});
		}

		const languageRaw = match[1]?.trim() ?? "";
		const language = languageRaw.length > 0 ? languageRaw : null;
		const value = match[2] ?? "";
		blocks.push({ type: "code", language, value });
		lastIndex = index + match[0].length;
	}

	if (lastIndex < content.length) {
		const prose = content.slice(lastIndex);
		blocks.push({
			type: "prose",
			tokens: expandMentionTokens(tokenizeMentions(prose)),
		});
	}

	if (blocks.length === 0) {
		return [
			{
				type: "prose",
				tokens: expandMentionTokens(tokenizeMentions(content)),
			},
		];
	}

	return blocks;
}

/** Parse message body into renderable blocks. Pure; no DOM. */
export function parseMessageContent(content: string): MessageContentBlock[] {
	return splitFences(content);
}

export function isImageAttachment(
	attachment: MessageAttachmentSnapshot,
): boolean {
	if (attachment.kind === "image") {
		return true;
	}
	const type = attachment.contentType?.toLowerCase() ?? "";
	return type.startsWith("image/");
}
