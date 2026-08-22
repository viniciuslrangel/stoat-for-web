import { describe, expect, it } from "vite-plus/test";

import { parseChannelId, parseServerId } from "@/domain/ids";
import {
	buildSendPayload,
	composerPlaceholder,
	defaultTextChannelId,
	mergeIncomingMessage,
	orderMessagesChronological,
	removeMessage,
	showsMemberList,
	snapshotChannel,
	snapshotChannelFromRest,
	snapshotMessage,
	snapshotMessageFromRest,
	snapshotMessagesFromRest,
	snapshotServerChannels,
} from "./chat-snapshots";

describe("snapshotChannel", () => {
	it("copies id, name, type, and server id", () => {
		expect(
			snapshotChannel({
				id: "01CHANNEL",
				name: " general ",
				type: "TextChannel",
				serverId: "01SERVER",
			}),
		).toEqual({
			id: "01CHANNEL",
			name: "general",
			type: "TextChannel",
			serverId: "01SERVER",
			memberNames: [],
			isVoice: false,
		});
	});

	it("marks text channels with a voice object as voice-capable", () => {
		expect(
			snapshotChannel({
				id: "01CHANNEL",
				name: "lounge",
				type: "TextChannel",
				voice: {},
			}),
		).toMatchObject({ isVoice: true });
	});

	it("keeps DMs off the server sidebar", () => {
		expect(
			snapshotChannel({
				id: "01DM",
				displayName: "ada",
				type: "DirectMessage",
			}),
		).toMatchObject({
			id: "01DM",
			name: "ada",
			type: "DirectMessage",
			serverId: null,
		});
	});

	it("drops unknown types and empty ids", () => {
		expect(
			snapshotChannel({ id: "01CHANNEL", name: "x", type: "Forum" }),
		).toBeNull();
		expect(
			snapshotChannel({ id: "", name: "x", type: "TextChannel" }),
		).toBeNull();
	});
});

describe("snapshotChannelFromRest", () => {
	it("reads _id, name, channel_type, and server", () => {
		expect(
			snapshotChannelFromRest({
				_id: "01CHANNEL",
				name: "general",
				channel_type: "TextChannel",
				server: "01SERVER",
			}),
		).toMatchObject({
			id: "01CHANNEL",
			name: "general",
			type: "TextChannel",
			serverId: "01SERVER",
		});
	});
});

describe("snapshotServerChannels", () => {
	it("keeps plain {id,name,type} rows and skips junk", () => {
		expect(
			snapshotServerChannels({
				serverId: "01SERVER",
				name: " Lounge ",
				channels: [
					{ id: "", name: "bad", type: "TextChannel" },
					{ id: "01A", name: "general", type: "TextChannel" },
					{ id: "01B", name: "voice", type: "VoiceChannel" },
				],
			}),
		).toEqual({
			serverId: "01SERVER",
			name: "Lounge",
			channels: [
				{ id: "01A", name: "general", type: "TextChannel", isVoice: false },
				{ id: "01B", name: "voice", type: "VoiceChannel", isVoice: true },
			],
		});
	});
});

describe("defaultTextChannelId", () => {
	it("prefers a text channel over voice", () => {
		expect(
			defaultTextChannelId([
				{
					id: parseChannelId("01V"),
					name: "voice",
					type: "TextChannel",
					isVoice: true,
				},
				{
					id: parseChannelId("01T"),
					name: "general",
					type: "TextChannel",
					isVoice: false,
				},
			]),
		).toBe("01T");
	});

	it("returns null when the server has no channels", () => {
		expect(defaultTextChannelId([])).toBeNull();
	});
});

describe("snapshotMessage", () => {
	it("copies id, author, content, and timestamp", () => {
		expect(
			snapshotMessage({
				id: "01MSG",
				authorId: "01USER",
				authorName: "ada",
				authorAvatarUrl: "https://cdn.test/avatars/01FILE",
				authorPresence: "Online",
				content: "hello",
				createdAt: 9,
			}),
		).toEqual({
			id: "01MSG",
			authorId: "01USER",
			authorName: "ada",
			authorAvatarUrl: "https://cdn.test/avatars/01FILE",
			authorPresence: "Online",
			content: "hello",
			attachments: [],
			system: null,
			systemNames: {},
			createdAt: 9,
		});
	});

	it("allows empty content", () => {
		expect(
			snapshotMessage({
				id: "01MSG",
				authorName: "ada",
			}),
		).toMatchObject({
			id: "01MSG",
			content: "",
			authorId: null,
			authorAvatarUrl: null,
			authorPresence: null,
			system: null,
			systemNames: {},
		});
	});

	it("keeps a parsed system discriminant", () => {
		expect(
			snapshotMessage({
				id: "01SYS",
				authorName: "Revolt",
				system: { type: "user_joined", userId: "01ALICE" },
				systemNames: { "01ALICE": "Alice" },
			}),
		).toMatchObject({
			id: "01SYS",
			system: { type: "user_joined", userId: "01ALICE" },
			systemNames: { "01ALICE": "Alice" },
		});
	});
});

describe("snapshotMessageFromRest", () => {
	it("resolves the author name from the users map", () => {
		expect(
			snapshotMessageFromRest(
				{ _id: "01MSG", author: "01USER", content: "hi" },
				new Map([
					[
						"01USER",
						{
							name: "Ada",
							avatarUrl: "https://cdn.test/avatars/01A",
							presence: "Focus",
						},
					],
				]),
			),
		).toMatchObject({
			id: "01MSG",
			authorId: "01USER",
			authorName: "Ada",
			authorAvatarUrl: "https://cdn.test/avatars/01A",
			authorPresence: "Focus",
			content: "hi",
			system: null,
		});
	});

	it("parses system payloads and resolves involved users", () => {
		expect(
			snapshotMessageFromRest(
				{
					_id: "01SYS",
					author: "00000000000000000000000000",
					content: null,
					system: { type: "user_joined", id: "01ALICE" },
				},
				new Map([
					["01ALICE", { name: "Alice", avatarUrl: null, presence: null }],
				]),
			),
		).toMatchObject({
			id: "01SYS",
			content: "",
			system: { type: "user_joined", userId: "01ALICE" },
			systemNames: { "01ALICE": "Alice" },
		});
	});

	it("snapshots image attachments from autumn fields", () => {
		expect(
			snapshotMessageFromRest(
				{
					_id: "01MSG",
					author: "01USER",
					content: "pic",
					attachments: [
						{
							_id: "01FILE",
							tag: "attachments",
							filename: "shot.png",
							content_type: "image/png",
							metadata: { type: "Image", width: 10, height: 10 },
						},
					],
				},
				new Map(),
				{ autumnBase: "https://autumn.test" },
			),
		).toMatchObject({
			content: "pic",
			attachments: [
				{
					id: "01FILE",
					url: "https://autumn.test/attachments/01FILE",
					filename: "shot.png",
					contentType: "image/png",
					kind: "image",
				},
			],
		});
	});
});

describe("snapshotMessagesFromRest", () => {
	it("keeps valid rows from a newest-first payload", () => {
		const messages = snapshotMessagesFromRest([
			{ _id: "01MSGNEW", author: "01USER", content: "later" },
			{ _id: "01MSGOLD", author: "01USER", content: "earlier" },
		]);
		expect(messages.map((row) => row.content).sort()).toEqual([
			"earlier",
			"later",
		]);
	});

	it("builds autumn avatar urls from the users payload", () => {
		const messages = snapshotMessagesFromRest(
			{
				messages: [{ _id: "01MSG", author: "01USER", content: "hi" }],
				users: [
					{
						_id: "01USER",
						username: "viniciusrangel",
						display_name: "ViniciusRangel",
						avatar: {
							_id: "01GIF",
							tag: "avatars",
							content_type: "image/gif",
						},
						online: true,
						status: { presence: "Online" },
					},
				],
			},
			{
				autumnBase: "https://cdn.test",
				apiBase: "https://api.test",
			},
		);
		expect(messages[0]).toMatchObject({
			authorName: "ViniciusRangel",
			authorAvatarUrl: "https://cdn.test/avatars/01GIF/original",
			authorPresence: "Online",
		});
	});
});

describe("orderMessagesChronological", () => {
	it("sorts by createdAt then id", () => {
		expect(
			orderMessagesChronological([
				{
					id: "b",
					authorId: null,
					authorName: "x",
					authorAvatarUrl: null,
					authorPresence: null,
					content: "",
					attachments: [],
					system: null,
					systemNames: {},
					createdAt: 2,
				},
				{
					id: "a",
					authorId: null,
					authorName: "x",
					authorAvatarUrl: null,
					authorPresence: null,
					content: "",
					attachments: [],
					system: null,
					systemNames: {},
					createdAt: 2,
				},
				{
					id: "c",
					authorId: null,
					authorName: "x",
					authorAvatarUrl: null,
					authorPresence: null,
					content: "",
					attachments: [],
					system: null,
					systemNames: {},
					createdAt: 1,
				},
			]).map((row) => row.id),
		).toEqual(["c", "a", "b"]);
	});
});

describe("mergeIncomingMessage", () => {
	it("appends a new row and ignores duplicates", () => {
		const first = {
			id: "01A",
			authorId: null,
			authorName: "x",
			authorAvatarUrl: null,
			authorPresence: null,
			content: "a",
			attachments: [],
			system: null,
			systemNames: {},
			createdAt: 1,
		};
		const incoming = {
			id: "01B",
			authorId: null,
			authorName: "x",
			authorAvatarUrl: null,
			authorPresence: null,
			content: "b",
			attachments: [],
			system: null,
			systemNames: {},
			createdAt: 2,
		};
		expect(
			mergeIncomingMessage([first], incoming).map((row) => row.id),
		).toEqual(["01A", "01B"]);
		expect(mergeIncomingMessage([first], first).map((row) => row.id)).toEqual([
			"01A",
		]);
	});
});

describe("removeMessage", () => {
	it("drops the matching id", () => {
		expect(
			removeMessage(
				[
					{
						id: "01A",
						authorId: null,
						authorName: "x",
						authorAvatarUrl: null,
						authorPresence: null,
						content: "a",
						attachments: [],
						system: null,
						systemNames: {},
						createdAt: 1,
					},
					{
						id: "01B",
						authorId: null,
						authorName: "x",
						authorAvatarUrl: null,
						authorPresence: null,
						content: "b",
						attachments: [],
						system: null,
						systemNames: {},
						createdAt: 2,
					},
				],
				"01A",
			).map((row) => row.id),
		).toEqual(["01B"]);
	});
});

describe("buildSendPayload", () => {
	it("trims content and rejects blanks", () => {
		expect(buildSendPayload("  hello  ")).toEqual({ content: "hello" });
		expect(buildSendPayload("   ")).toBeNull();
		expect(buildSendPayload("")).toBeNull();
	});
});

describe("showsMemberList", () => {
	it("hides DMs and Saved Notes even when names exist", () => {
		expect(
			showsMemberList({
				id: parseChannelId("01DM"),
				name: "ada",
				type: "DirectMessage",
				serverId: null,
				memberNames: ["ada"],
				isVoice: true,
			}),
		).toBe(false);
	});

	it("shows a group regardless of recipient names", () => {
		expect(
			showsMemberList({
				id: parseChannelId("01GROUP"),
				name: "Party",
				type: "Group",
				serverId: null,
				memberNames: [],
				isVoice: true,
			}),
		).toBe(true);
	});

	it("shows server text channels without relying on recipient names", () => {
		expect(
			showsMemberList({
				id: parseChannelId("01CHAN"),
				name: "general",
				type: "TextChannel",
				serverId: parseServerId("01SERVER"),
				memberNames: [],
				isVoice: false,
			}),
		).toBe(true);
	});
});

describe("composerPlaceholder", () => {
	it("uses Discord-like copy per channel type", () => {
		expect(
			composerPlaceholder({
				id: parseChannelId("01T"),
				name: "general",
				type: "TextChannel",
				serverId: parseServerId("01S"),
				memberNames: [],
				isVoice: false,
			}),
		).toBe("Message #general");
		expect(
			composerPlaceholder({
				id: parseChannelId("01DM"),
				name: "ada",
				type: "DirectMessage",
				serverId: null,
				memberNames: [],
				isVoice: true,
			}),
		).toBe("Message @ada");
	});
});
