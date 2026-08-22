import { describe, expect, it } from "vite-plus/test";

import {
	autumnFileUrl,
	avatarUrlFromRestFile,
	isGifContentType,
	userAvatarUrlFromSdk,
	withAutumnOriginal,
} from "@/lib/avatar-url";

describe("autumnFileUrl", () => {
	it("uses the static path for non-gif files", () => {
		expect(
			autumnFileUrl({
				autumnBase: "https://cdn.test/",
				tag: "avatars",
				fileId: "01FILE",
				contentType: "image/png",
			}),
		).toBe("https://cdn.test/avatars/01FILE");
	});

	it("appends /original for image/gif (broken path freezes animation)", () => {
		expect(
			autumnFileUrl({
				autumnBase: "https://cdn.test",
				tag: "avatars",
				fileId: "01GIF",
				contentType: "image/gif",
			}),
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("honors animated=true without content type", () => {
		expect(
			autumnFileUrl({
				autumnBase: "https://cdn.test",
				tag: "avatars",
				fileId: "01X",
				animated: true,
			}),
		).toBe("https://cdn.test/avatars/01X/original");
	});
});

describe("withAutumnOriginal", () => {
	it("rewrites tag/id to tag/id/original for gifs", () => {
		expect(
			withAutumnOriginal("https://cdn.test/avatars/01GIF", {
				contentType: "image/gif",
			}),
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("leaves non-gif urls alone", () => {
		expect(
			withAutumnOriginal("https://cdn.test/avatars/01PNG", {
				contentType: "image/png",
			}),
		).toBe("https://cdn.test/avatars/01PNG");
	});
});

describe("userAvatarUrlFromSdk", () => {
	it("prefers animatedAvatarURL over avatarURL", () => {
		expect(
			userAvatarUrlFromSdk({
				avatarURL: "https://cdn.test/avatars/01/static",
				animatedAvatarURL: "https://cdn.test/avatars/01/original",
			}),
		).toBe("https://cdn.test/avatars/01/original");
	});
});

describe("avatarUrlFromRestFile", () => {
	it("keeps gif animation via /original", () => {
		expect(
			avatarUrlFromRestFile(
				{
					_id: "01GIF",
					tag: "avatars",
					content_type: "image/gif",
				},
				"01USER",
				"https://cdn.test",
				"https://api.test",
			),
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("falls back to default avatar", () => {
		expect(
			avatarUrlFromRestFile(null, "01USER", null, "https://api.test/"),
		).toBe("https://api.test/users/01USER/default_avatar");
	});
});

describe("isGifContentType", () => {
	it("matches image/gif case-insensitively", () => {
		expect(isGifContentType("image/gif")).toBe(true);
		expect(isGifContentType("Image/GIF")).toBe(true);
		expect(isGifContentType("image/png")).toBe(false);
	});
});
