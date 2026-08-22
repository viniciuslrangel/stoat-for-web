import { describe, expect, it } from "vite-plus/test";

import { messageForFriendFailure } from "./useFriends";

describe("messageForFriendFailure", () => {
	it("maps Stoat friend errors", () => {
		expect(messageForFriendFailure({ type: "AlreadyFriends" })).toBe(
			"Already friends with this user.",
		);
		expect(messageForFriendFailure({ type: "AlreadySentRequest" })).toBe(
			"You've already sent a request to this user.",
		);
		expect(messageForFriendFailure(new Error("Enter a username."))).toBe(
			"Enter a username.",
		);
	});
});
