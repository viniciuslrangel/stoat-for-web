import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

if (typeof Element.prototype.getAnimations !== "function") {
	Element.prototype.getAnimations = () => [];
}

import { FriendsView } from "@/components/friends/FriendsPage";
import { parseUserId } from "@/domain/ids";
import {
	emptyFriendsSnapshot,
	type FriendRow,
	type FriendsSnapshot,
} from "@/hooks/friends-snapshots";

function friend(overrides: Partial<FriendRow> = {}): FriendRow {
	return {
		id: parseUserId("01ADA"),
		username: "ada",
		discriminator: "1234",
		displayName: "Ada",
		avatarUrl: "",
		relationship: "Friend",
		online: true,
		presence: "Online",
		statusText: null,
		isBot: false,
		...overrides,
	};
}

function renderView(lists: FriendsSnapshot) {
	const handlers = {
		onOpenDm: vi.fn(),
		onOpenProfile: vi.fn(),
		onAccept: vi.fn(),
		onRemove: vi.fn(),
		onBlock: vi.fn(),
		onUnblock: vi.fn(),
	};
	const onAddFriend = vi.fn(async () => {});
	render(
		<FriendsView
			loading={false}
			lists={lists}
			handlers={handlers}
			onAddFriend={onAddFriend}
		/>,
	);
	return { handlers, onAddFriend };
}

describe("FriendsView", () => {
	it("shows in-page tabs and Add friend, not a lone heading", () => {
		renderView(emptyFriendsSnapshot());
		expect(screen.getByTestId("screen-friends")).toBeVisible();
		expect(screen.getByRole("tab", { name: "Online" })).toBeVisible();
		expect(screen.getByRole("tab", { name: "All" })).toBeVisible();
		expect(screen.getByRole("tab", { name: "Pending" })).toBeVisible();
		expect(screen.getByRole("tab", { name: "Blocked" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Add friend" })).toBeVisible();
		expect(screen.getByText("No friends are online.")).toBeVisible();
	});

	it("opens a DM from a friend row, not from the avatar", async () => {
		const user = userEvent.setup();
		const ada = friend();
		const { handlers } = renderView({
			...emptyFriendsSnapshot(),
			online: [ada],
			all: [ada],
		});

		await user.click(screen.getByRole("button", { name: "Message Ada" }));
		expect(handlers.onOpenDm).toHaveBeenCalledTimes(1);
		expect(handlers.onOpenProfile).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Profile for Ada" }));
		expect(handlers.onOpenProfile).toHaveBeenCalledTimes(1);
		expect(handlers.onOpenDm).toHaveBeenCalledTimes(1);
	});

	it("opens the add friend control without changing the URL", async () => {
		const user = userEvent.setup();
		renderView(emptyFriendsSnapshot());
		await user.click(screen.getByRole("button", { name: "Add friend" }));
		expect(
			screen.getByRole("dialog", { name: "Add a new friend" }),
		).toBeVisible();
		expect(screen.getByLabelText("Username")).toBeVisible();
	});
});
