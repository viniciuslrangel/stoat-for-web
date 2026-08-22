import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { UserAccountMenu } from "@/components/shell/UserAccountMenu";
import { parseUserId } from "@/domain/ids";
import type { MeSnapshot } from "@/hooks/shell-snapshots";

const me: MeSnapshot = {
	id: parseUserId("01USERACCOUNT"),
	username: "stoattest",
	displayName: "Stoat Test",
	avatarUrl: "https://example.com/avatar.png",
	presence: "Online",
};

function renderMenu(initialEntries: string[] = ["/"]) {
	const rootRoute = createRootRoute({
		component: Outlet,
	});
	const homeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: function HomePage() {
			return (
				<UserAccountMenu
					me={me}
					subtitle={<p data-testid="menu-subtitle">@{me.username}</p>}
				/>
			);
		},
	});
	const settingsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/settings",
		component: function SettingsPage() {
			return <div data-testid="settings-dest">Settings</div>;
		},
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([homeRoute, settingsRoute]),
		history: createMemoryHistory({ initialEntries }),
	});
	return {
		router,
		...render(<RouterProvider router={router} />),
	};
}

describe("UserAccountMenu", () => {
	it("opens a menu and navigates to settings", async () => {
		const user = userEvent.setup();
		const { router } = renderMenu();

		await user.click(await screen.findByTestId("user-tray-avatar-menu"));
		expect(await screen.findByTestId("user-account-menu")).toBeVisible();
		expect(screen.getByTestId("user-account-menu-settings")).toHaveTextContent(
			"User Settings",
		);

		await user.click(screen.getByTestId("user-account-menu-settings"));
		await expect.poll(() => router.state.location.pathname).toBe("/settings");
		expect(await screen.findByTestId("settings-dest")).toBeVisible();
	});

	it("copies the user id", async () => {
		const user = userEvent.setup();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});

		renderMenu();
		await user.click(await screen.findByTestId("user-tray-avatar-menu"));
		await user.click(await screen.findByTestId("user-account-menu-copy-id"));

		expect(writeText).toHaveBeenCalledWith("01USERACCOUNT");
	});
});
