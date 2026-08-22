import { describe, expect, it } from "vite-plus/test";

import { parseUserId } from "@/domain/ids";
import {
	buildGroupMemberList,
	buildMemberListSections,
	snapshotMemberListMember,
} from "@/hooks/member-list-snapshots";

const ADA = "01USERADAXXXXX";
const BOB = "01USERBOBXXXXX";
const CAROL = "01USERCAROLXXX";

function member(
	overrides: Partial<{
		id: string;
		nickname: string;
		displayName: string;
		username: string;
		online: boolean;
		presence: string;
		hoistedRoleId: string | null;
		roleIds: string[];
	}>,
) {
	return snapshotMemberListMember(
		{
			id: overrides.id ?? ADA,
			nickname: overrides.nickname,
			displayName: overrides.displayName,
			username: overrides.username ?? "user",
			online: overrides.online ?? true,
			presence: overrides.presence ?? "Online",
			hoistedRoleId: overrides.hoistedRoleId ?? null,
			roleIds: overrides.roleIds ?? [],
		},
		new Set(["role-mod"]),
	)!;
}

describe("snapshotMemberListMember", () => {
	it("uses nickname as display name", () => {
		const row = member({ nickname: "Captain", displayName: "Ada" });
		expect(row.displayName).toBe("Captain");
		expect(row.id).toBe(parseUserId(ADA));
	});

	it("assigns the first matching hoisted role when online", () => {
		const row = member({
			roleIds: ["role-other", "role-mod"],
			online: true,
		});
		expect(row.hoistedRoleId).toBe("role-mod");
	});

	it("clears hoist for offline members", () => {
		const row = member({
			roleIds: ["role-mod"],
			hoistedRoleId: "role-mod",
			online: false,
		});
		expect(row.hoistedRoleId).toBeNull();
		expect(row.presence).toBe("Invisible");
	});
});

describe("buildMemberListSections", () => {
	it("groups hoisted, online, and offline by Discord/Solid order", () => {
		const snapshot = buildMemberListSections(
			[
				member({
					id: ADA,
					username: "ada",
					displayName: "Ada",
					online: true,
					roleIds: ["role-mod"],
				}),
				member({
					id: BOB,
					username: "bob",
					displayName: "Bob",
					online: true,
				}),
				member({
					id: CAROL,
					username: "carol",
					displayName: "Carol",
					online: false,
				}),
			],
			[{ id: "role-mod", name: "Moderators" }],
		);

		expect(snapshot.onlineCount).toBe(2);
		expect(snapshot.sections.map((section) => section.key)).toEqual([
			"role:role-mod",
			"online",
			"offline",
		]);
		expect(snapshot.sections[0]?.members.map((row) => row.displayName)).toEqual(
			["Ada"],
		);
		expect(snapshot.sections[1]?.members.map((row) => row.displayName)).toEqual(
			["Bob"],
		);
		expect(snapshot.sections[2]?.members.map((row) => row.displayName)).toEqual(
			["Carol"],
		);
	});

	it("omits empty role buckets and sorts by display name", () => {
		const snapshot = buildMemberListSections(
			[
				member({
					id: BOB,
					username: "bob",
					displayName: "Zed",
					online: true,
				}),
				member({
					id: ADA,
					username: "ada",
					displayName: "Ann",
					online: true,
				}),
			],
			[{ id: "role-mod", name: "Moderators" }],
		);
		expect(snapshot.sections.map((section) => section.key)).toEqual(["online"]);
		expect(snapshot.sections[0]?.members.map((row) => row.displayName)).toEqual(
			["Ann", "Zed"],
		);
	});
});

describe("buildGroupMemberList", () => {
	it("puts everyone under a single Members section", () => {
		const snapshot = buildGroupMemberList([
			member({ id: BOB, displayName: "Bob", username: "bob" }),
			member({ id: ADA, displayName: "Ada", username: "ada" }),
		]);
		expect(snapshot.sections).toHaveLength(1);
		expect(snapshot.sections[0]?.key).toBe("members");
		expect(snapshot.sections[0]?.members.map((row) => row.displayName)).toEqual(
			["Ada", "Bob"],
		);
	});
});
