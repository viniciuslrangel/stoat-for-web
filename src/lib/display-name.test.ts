import { describe, expect, it } from "vite-plus/test";

import {
	displayedAuthorName,
	displayNameForUser,
	isUnresolvedDisplayName,
} from "@/lib/display-name";

describe("displayNameForUser", () => {
	it("prefers nickname over display name and username", () => {
		expect(
			displayNameForUser({
				nickname: "Nick",
				displayName: "Display",
				username: "user",
				userId: "01USER",
			}),
		).toBe("Nick");
	});

	it("prefers display name over username", () => {
		expect(
			displayNameForUser({
				displayName: "Display",
				username: "user",
				userId: "01USER",
			}),
		).toBe("Display");
	});

	it("falls back to username then short id", () => {
		expect(
			displayNameForUser({
				username: "user",
				userId: "01ABCDEFGHJKMNPQRSTVWXYZ01",
			}),
		).toBe("user");
		expect(
			displayNameForUser({
				userId: "01ABCDEFGHJKMNPQRSTVWXYZ01",
			}),
		).toBe("01ABCDEF");
	});

	it("returns Unknown only when nothing is available", () => {
		expect(displayNameForUser({})).toBe("Unknown");
	});
});

describe("displayedAuthorName", () => {
	const USER = "01ABCDEFGHJKMNPQRSTVWXYZ01";

	it("replaces Unknown with a member lookup", () => {
		expect(
			displayedAuthorName(
				{ authorId: USER, authorName: "Unknown" },
				new Map([[USER, "Ada"]]),
			),
		).toBe("Ada");
	});

	it("keeps a resolved author name", () => {
		expect(
			displayedAuthorName(
				{ authorId: USER, authorName: "Masquerade" },
				new Map([[USER, "Ada"]]),
			),
		).toBe("Masquerade");
	});

	it("treats short ids as unresolved", () => {
		expect(isUnresolvedDisplayName("01ABCDEF", USER)).toBe(true);
	});
});
