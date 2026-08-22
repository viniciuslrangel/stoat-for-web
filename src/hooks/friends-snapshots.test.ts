import { describe, expect, it } from "vite-plus/test";

import { parseUserId } from "@/domain/ids";

import {
	friendSubtitle,
	friendTag,
	pendingBadgeLabel,
	presenceLabel,
	snapshotFriend,
	snapshotFriends,
} from "./friends-snapshots";

describe("snapshotFriend", () => {
	it("copies a friend into a plain row", () => {
		expect(
			snapshotFriend({
				id: "01USER",
				username: " ada ",
				discriminator: "1234",
				displayName: " Ada Lovelace ",
				avatarUrl: "https://cdn.test/ada",
				relationship: "Friend",
				online: true,
				presence: "Idle",
				statusText: " reading ",
			}),
		).toEqual({
			id: "01USER",
			username: "ada",
			discriminator: "1234",
			displayName: "Ada Lovelace",
			avatarUrl: "https://cdn.test/ada",
			relationship: "Friend",
			online: true,
			presence: "Idle",
			statusText: "reading",
			isBot: false,
		});
	});

	it("drops self, strangers, and invalid ids", () => {
		expect(
			snapshotFriend({
				id: "01ME",
				username: "me",
				relationship: "User",
			}),
		).toBeNull();
		expect(
			snapshotFriend({
				id: "01STRANGER",
				username: "x",
				relationship: "None",
			}),
		).toBeNull();
		expect(
			snapshotFriend({
				id: "",
				username: "ada",
				relationship: "Friend",
			}),
		).toBeNull();
	});

	it("treats offline users as Invisible", () => {
		expect(
			snapshotFriend({
				id: "01USER",
				username: "ada",
				relationship: "Friend",
				online: false,
				presence: "Online",
			})?.presence,
		).toBe("Invisible");
	});
});

describe("snapshotFriends", () => {
	it("buckets and sorts by display name", () => {
		const lists = snapshotFriends([
			{
				id: "01B",
				username: "b",
				displayName: "Beta",
				relationship: "Friend",
				online: true,
				presence: "Online",
			},
			{
				id: "01A",
				username: "a",
				displayName: "Alpha",
				relationship: "Friend",
				online: false,
			},
			{
				id: "01IN",
				username: "in",
				displayName: "Incoming",
				relationship: "Incoming",
			},
			{
				id: "01OUT",
				username: "out",
				displayName: "Outgoing",
				relationship: "Outgoing",
			},
			{
				id: "01BLOCK",
				username: "block",
				displayName: "Blocked",
				relationship: "Blocked",
			},
			{
				id: "01SKIP",
				username: "skip",
				relationship: "None",
			},
		]);

		expect(lists.all.map((row) => row.id)).toEqual(["01A", "01B"]);
		expect(lists.online.map((row) => row.id)).toEqual(["01B"]);
		expect(lists.incoming.map((row) => row.id)).toEqual(["01IN"]);
		expect(lists.outgoing.map((row) => row.id)).toEqual(["01OUT"]);
		expect(lists.blocked.map((row) => row.id)).toEqual(["01BLOCK"]);
	});

	it("keeps Invisible friends off the Online tab", () => {
		const lists = snapshotFriends([
			{
				id: "01GHOST",
				username: "ghost",
				relationship: "Friend",
				online: true,
				presence: "Invisible",
			},
		]);
		expect(lists.all).toHaveLength(1);
		expect(lists.online).toHaveLength(0);
	});
});

describe("labels", () => {
	it("shows Busy as Do Not Disturb", () => {
		expect(presenceLabel("Busy")).toBe("Do Not Disturb");
		expect(presenceLabel("Focus")).toBe("Focus");
		expect(presenceLabel("Invisible")).toBe("Offline");
	});

	it("uses request copy for pending rows", () => {
		const incoming = snapshotFriend({
			id: "01IN",
			username: "in",
			relationship: "Incoming",
		});
		expect(incoming && friendSubtitle(incoming)).toBe(
			"Incoming Friend Request",
		);
	});

	it("caps the pending badge", () => {
		expect(pendingBadgeLabel(0)).toBeNull();
		expect(pendingBadgeLabel(3)).toBe("3");
		expect(pendingBadgeLabel(100)).toBe("99+");
	});

	it("formats a username tag", () => {
		expect(
			friendTag({
				id: parseUserId("01USER"),
				username: "ada",
				discriminator: "1234",
				displayName: "Ada",
				avatarUrl: "",
				relationship: "Friend",
				online: true,
				presence: "Online",
				statusText: null,
				isBot: false,
			}),
		).toBe("ada#1234");
	});
});
