import { describe, expect, it } from "vite-plus/test";

import {
	meFromRest,
	snapshotConversation,
	snapshotConversations,
	snapshotMe,
	snapshotSavedNotesId,
	snapshotServer,
	snapshotServers,
} from "./shell-snapshots";

describe("snapshotServer", () => {
	it("copies id, name, and icon", () => {
		expect(
			snapshotServer({
				id: "01SERVER",
				name: " Lounge ",
				iconUrl: "https://cdn.test/icons/1",
			}),
		).toEqual({
			id: "01SERVER",
			name: "Lounge",
			iconUrl: "https://cdn.test/icons/1",
		});
	});

	it("drops invalid ids and empty names", () => {
		expect(snapshotServer({ id: "", name: "Lounge" })).toBeNull();
		expect(snapshotServer({ id: "01SERVER", name: "  " })).toBeNull();
		expect(snapshotServer({ id: 1, name: "Lounge" })).toBeNull();
	});
});

describe("snapshotServers", () => {
	it("skips bad rows and keeps order", () => {
		expect(
			snapshotServers([
				{ id: "", name: "bad" },
				{ id: "01A", name: "Alpha" },
				{ id: "01B", name: "Beta", iconUrl: null },
			]),
		).toEqual([
			{ id: "01A", name: "Alpha", iconUrl: null },
			{ id: "01B", name: "Beta", iconUrl: null },
		]);
	});
});

describe("snapshotConversation", () => {
	it("keeps active direct messages", () => {
		expect(
			snapshotConversation({
				id: "01DM",
				type: "DirectMessage",
				active: true,
				displayName: "ada",
				iconUrl: "https://cdn.test/avatars/ada",
				updatedAt: 20,
			}),
		).toEqual({
			id: "01DM",
			kind: "direct",
			name: "ada",
			iconUrl: "https://cdn.test/avatars/ada",
			memberCount: null,
			updatedAt: 20,
			presence: "Invisible",
		});
	});

	it("maps recipient presence on active DMs", () => {
		expect(
			snapshotConversation({
				id: "01DM",
				type: "DirectMessage",
				active: true,
				displayName: "ada",
				updatedAt: 20,
				recipientOnline: true,
				recipientPresence: "Idle",
			})?.presence,
		).toBe("Idle");
	});

	it("drops inactive direct messages", () => {
		expect(
			snapshotConversation({
				id: "01DM",
				type: "DirectMessage",
				active: false,
				name: "ada",
			}),
		).toBeNull();
	});

	it("keeps groups with member counts", () => {
		expect(
			snapshotConversation({
				id: "01GROUP",
				type: "Group",
				name: "Party",
				memberCount: 4,
				updatedAt: 3,
			}),
		).toMatchObject({
			id: "01GROUP",
			kind: "group",
			name: "Party",
			memberCount: 4,
			presence: null,
		});
	});

	it("skips server channels and notes", () => {
		expect(
			snapshotConversation({
				id: "01TEXT",
				type: "TextChannel",
				name: "general",
			}),
		).toBeNull();
		expect(
			snapshotConversation({
				id: "01NOTES",
				type: "SavedMessages",
				name: "Notes",
			}),
		).toBeNull();
	});
});

describe("snapshotConversations", () => {
	it("sorts by updatedAt descending", () => {
		const conversations = snapshotConversations([
			{
				id: "01OLD",
				type: "Group",
				name: "Old",
				updatedAt: 1,
			},
			{
				id: "01NEW",
				type: "DirectMessage",
				active: true,
				name: "New",
				updatedAt: 9,
			},
		]);
		expect(conversations.map((row) => row.id)).toEqual(["01NEW", "01OLD"]);
	});
});

describe("snapshotSavedNotesId", () => {
	it("returns the first SavedMessages channel", () => {
		expect(
			snapshotSavedNotesId([
				{ id: "01DM", type: "DirectMessage" },
				{ id: "01NOTES", type: "SavedMessages" },
			]),
		).toBe("01NOTES");
	});

	it("returns null when the API has none", () => {
		expect(
			snapshotSavedNotesId([{ id: "01DM", type: "DirectMessage" }]),
		).toBeNull();
	});
});

describe("snapshotMe", () => {
	it("falls display name back to username", () => {
		expect(
			snapshotMe({
				id: "01USER",
				username: "stoattest",
				avatarUrl: "https://api.test/users/01USER/default_avatar",
				online: true,
				presence: "Online",
			}),
		).toEqual({
			id: "01USER",
			username: "stoattest",
			displayName: "stoattest",
			avatarUrl: "https://api.test/users/01USER/default_avatar",
			presence: "Online",
		});
	});

	it("maps Busy and offline through presence", () => {
		expect(
			snapshotMe({
				id: "01USER",
				username: "stoattest",
				avatarUrl: "https://api.test/users/01USER/default_avatar",
				online: true,
				presence: "Busy",
			})?.presence,
		).toBe("Busy");
		expect(
			snapshotMe({
				id: "01USER",
				username: "stoattest",
				avatarUrl: "https://api.test/users/01USER/default_avatar",
				online: false,
				presence: "Online",
			})?.presence,
		).toBe("Invisible");
	});
});

describe("meFromRest", () => {
	it("builds an autumn avatar url", () => {
		expect(
			meFromRest(
				{
					_id: "01USER",
					username: "stoattest",
					display_name: "Stoat Test",
					avatar: { _id: "01FILE", tag: "avatars" },
					online: true,
					status: { presence: "Focus" },
				},
				"https://cdn.test",
				"https://api.test",
			),
		).toEqual({
			id: "01USER",
			username: "stoattest",
			displayName: "Stoat Test",
			avatarUrl: "https://cdn.test/avatars/01FILE",
			presence: "Focus",
		});
	});

	it("keeps gif avatars on /original", () => {
		expect(
			meFromRest(
				{
					_id: "01USER",
					username: "stoattest",
					online: true,
					avatar: {
						_id: "01GIF",
						tag: "avatars",
						content_type: "image/gif",
					},
				},
				"https://cdn.test",
				"https://api.test",
			)?.avatarUrl,
		).toBe("https://cdn.test/avatars/01GIF/original");
	});

	it("uses the default avatar when autumn is missing", () => {
		expect(
			meFromRest(
				{ _id: "01USER", username: "stoattest" },
				null,
				"https://api.test/",
			),
		).toEqual({
			id: "01USER",
			username: "stoattest",
			displayName: "stoattest",
			avatarUrl: "https://api.test/users/01USER/default_avatar",
			presence: "Invisible",
		});
	});
});
