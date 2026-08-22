import { describe, expect, it } from "vite-plus/test";

import { readMessageAvatarUrl, sendChannelMessage } from "./useMessages";

describe("sendChannelMessage", () => {
	it("rejects blank content before calling the client", async () => {
		await expect(
			sendChannelMessage({ channelId: "01CHANNEL", content: "   " }),
		).rejects.toThrow("Message is empty");
	});
});

describe("readMessageAvatarUrl", () => {
	it("prefers animatedAvatarURL over static avatarURL", () => {
		expect(
			readMessageAvatarUrl({
				animatedAvatarURL: "https://cdn.test/avatars/01GIF/original",
				avatarURL: "https://cdn.test/avatars/01GIF",
			} as never),
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("upgrades a gif static autumn url via withAutumnOriginal", () => {
		expect(
			readMessageAvatarUrl({
				avatarURL: "https://cdn.test/avatars/01GIF",
				author: {
					avatar: { contentType: "image/gif" },
				},
			} as never),
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("uses userAvatarUrlFromSdk when message animated url is missing", () => {
		expect(
			readMessageAvatarUrl({
				author: {
					animatedAvatarURL: "https://cdn.test/avatars/01A/original",
					avatarURL: "https://cdn.test/avatars/01A",
				},
			} as never),
		).toBe("https://cdn.test/avatars/01A/original");
	});
});
