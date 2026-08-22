import { describe, expect, it } from "vite-plus/test";

import {
	looksLikeImageUrl,
	parseMessageContent,
	tokenizeUrls,
} from "@/lib/message-content";

const USER = "01M0DJ5Q6KX1BAJTTGKXHNPGV7";

describe("tokenizeUrls", () => {
	it("leaves plain text alone", () => {
		expect(tokenizeUrls("hello")).toEqual([{ type: "text", value: "hello" }]);
	});

	it("autolinks http(s) urls", () => {
		expect(tokenizeUrls("see https://example.com/path")).toEqual([
			{ type: "text", value: "see " },
			{
				type: "link",
				href: "https://example.com/path",
				label: "https://example.com/path",
			},
		]);
	});

	it("peels trailing punctuation from urls", () => {
		expect(tokenizeUrls("go https://example.com.")).toEqual([
			{ type: "text", value: "go " },
			{
				type: "link",
				href: "https://example.com",
				label: "https://example.com",
			},
			{ type: "text", value: "." },
		]);
	});

	it("emits image tokens for image-extension urls", () => {
		const src = "https://cdn.example.com/shot.png";
		expect(tokenizeUrls(src)).toEqual([{ type: "image", src, alt: src }]);
	});
});

describe("looksLikeImageUrl", () => {
	it("accepts common image extensions", () => {
		expect(looksLikeImageUrl("https://x.test/a.JPG?x=1")).toBe(true);
		expect(looksLikeImageUrl("https://x.test/a.webp")).toBe(true);
	});

	it("rejects non-image paths and non-http", () => {
		expect(looksLikeImageUrl("https://x.test/a.html")).toBe(false);
		expect(looksLikeImageUrl("javascript:alert(1)")).toBe(false);
	});
});

describe("parseMessageContent", () => {
	it("parses a fenced code block with language", () => {
		const content = "before\n```ts\nconst x = 1;\n```\nafter";
		expect(parseMessageContent(content)).toEqual([
			{
				type: "prose",
				tokens: [{ type: "text", value: "before\n" }],
			},
			{ type: "code", language: "ts", value: "const x = 1;\n" },
			{
				type: "prose",
				tokens: [{ type: "text", value: "after" }],
			},
		]);
	});

	it("parses a fence without a language tag", () => {
		expect(parseMessageContent("```\nplain\n```")).toEqual([
			{ type: "code", language: null, value: "plain\n" },
		]);
	});

	it("keeps mentions inside fences as literal text", () => {
		const content = "```\n<@" + USER + ">\n```";
		expect(parseMessageContent(content)).toEqual([
			{ type: "code", language: null, value: `<@${USER}>\n` },
		]);
	});

	it("keeps urls inside fences as literal text", () => {
		expect(parseMessageContent("```\nhttps://example.com\n```")).toEqual([
			{ type: "code", language: null, value: "https://example.com\n" },
		]);
	});

	it("parses mentions then autolinks in prose", () => {
		const content = `hi <@${USER}> see https://example.com`;
		expect(parseMessageContent(content)).toEqual([
			{
				type: "prose",
				tokens: [
					{ type: "text", value: "hi " },
					{ type: "user", id: USER },
					{ type: "text", value: " see " },
					{
						type: "link",
						href: "https://example.com",
						label: "https://example.com",
					},
				],
			},
		]);
	});

	it("does not autolink inside mention tokens", () => {
		expect(parseMessageContent(`<@${USER}>`)).toEqual([
			{
				type: "prose",
				tokens: [{ type: "user", id: USER }],
			},
		]);
	});

	it("mixes fence, mention, link, and image url", () => {
		const img = "https://cdn.example.com/pic.png";
		const content = `ping <@${USER}>\n\`\`\`js\n1\n\`\`\`\n${img}\nhttps://docs.example.com`;
		expect(parseMessageContent(content)).toEqual([
			{
				type: "prose",
				tokens: [
					{ type: "text", value: "ping " },
					{ type: "user", id: USER },
					{ type: "text", value: "\n" },
				],
			},
			{ type: "code", language: "js", value: "1\n" },
			{
				type: "prose",
				tokens: [
					{ type: "image", src: img, alt: img },
					{ type: "text", value: "\n" },
					{
						type: "link",
						href: "https://docs.example.com",
						label: "https://docs.example.com",
					},
				],
			},
		]);
	});
});
