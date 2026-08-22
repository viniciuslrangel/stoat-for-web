import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getDefaultStore } from "jotai";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { parseUserId } from "@/domain/ids";
import { sessionAtom } from "@/domain/session";
import type { MeSnapshot } from "@/hooks/shell-snapshots";
import { PREFS_KEY, settingsPageAtom } from "@/state/prefs";
import { SettingsOverlay } from "./SettingsOverlay";

const me: MeSnapshot = {
	id: parseUserId("01USERACCOUNT"),
	username: "stoattest",
	displayName: "Stoat Test",
	avatarUrl: "https://example.com/avatar.png",
	presence: "Online",
};

/** Isolate from other suites (e.g. sonner) that write next-themes' default `theme` key. */
const TEST_THEME_STORAGE_KEY = "settings-overlay-test-theme";

function renderOverlay(initialEntries: string[] = ["/settings"]) {
	const rootRoute = createRootRoute({
		component: Outlet,
	});
	const settingsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/settings",
		component: function SettingsPage() {
			return (
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem={false}
					storageKey={TEST_THEME_STORAGE_KEY}
				>
					<QueryClientProvider
						client={
							new QueryClient({
								defaultOptions: { queries: { retry: false } },
							})
						}
					>
						<SettingsOverlay loading={false} me={me} />
					</QueryClientProvider>
				</ThemeProvider>
			);
		},
	});
	const appRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/app",
		component: function AppDest() {
			return <div data-testid="app-dest">Home</div>;
		},
	});
	const loginRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/login/auth",
		component: function LoginDest() {
			return <div data-testid="login-dest">Login</div>;
		},
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([settingsRoute, appRoute, loginRoute]),
		history: createMemoryHistory({ initialEntries }),
	});
	return {
		router,
		...render(<RouterProvider router={router} />),
	};
}

describe("SettingsOverlay", () => {
	beforeEach(() => {
		window.localStorage.removeItem("theme");
		window.localStorage.removeItem(TEST_THEME_STORAGE_KEY);
		window.localStorage.removeItem(PREFS_KEY.theme);
		window.localStorage.removeItem(PREFS_KEY.settingsPage);
		getDefaultStore().set(settingsPageAtom, "account");
		getDefaultStore().set(sessionAtom, { kind: "anonymous" });
		document.documentElement.classList.remove("light", "dark");
	});

	it("shows category nav and an account panel, not a title-only page", async () => {
		renderOverlay();
		expect(await screen.findByTestId("screen-settings")).toBeVisible();
		expect(screen.getByTestId("settings-categories")).toBeVisible();
		expect(screen.getByRole("button", { name: "My Account" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("button", { name: "Appearance" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Voice" })).toBeVisible();
		expect(screen.getByRole("heading", { name: "My Account" })).toBeVisible();
		expect(screen.getByText("Stoat Test")).toBeVisible();
		expect(screen.getByText("stoattest")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Close settings" }),
		).toBeVisible();
		expect(screen.getByText("ESC")).toBeVisible();
	});

	it("switches to appearance theme choices", async () => {
		const user = userEvent.setup();
		renderOverlay();
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByRole("button", { name: "Appearance" }));
		expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
		await waitFor(() => {
			expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
		});
		await user.click(screen.getByRole("radio", { name: "Light" }));
		expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
	});

	it("shows a voice stub without Nitro", async () => {
		const user = userEvent.setup();
		renderOverlay();
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByRole("button", { name: "Voice" }));
		expect(screen.getByRole("heading", { name: "Voice" })).toBeVisible();
		expect(
			screen.getByText(
				"Join a voice-capable channel from the server sidebar. Mute, deafen, and End Call live on the call pane.",
			),
		).toBeVisible();
		expect(screen.queryByText(/nitro/i)).toBeNull();
	});

	it("closes back to the previous in-app path", async () => {
		const user = userEvent.setup();
		renderOverlay(["/app", "/settings"]);
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByRole("button", { name: "Close settings" }));
		expect(await screen.findByTestId("app-dest")).toBeVisible();
	});

	it("closes a bookmarked overlay to /app", async () => {
		const user = userEvent.setup();
		renderOverlay(["/settings"]);
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByRole("button", { name: "Close settings" }));
		expect(await screen.findByTestId("app-dest")).toBeVisible();
	});

	it("Escape closes the overlay to /app", async () => {
		const user = userEvent.setup();
		renderOverlay(["/settings"]);
		await screen.findByTestId("screen-settings");
		await user.keyboard("{Escape}");
		expect(await screen.findByTestId("app-dest")).toBeVisible();
	});

	it("requires confirmation before logging out", async () => {
		const user = userEvent.setup();
		renderOverlay();
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByTestId("open-logout"));
		expect(screen.getByRole("dialog")).toBeVisible();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
		expect(screen.getByTestId("screen-settings")).toBeVisible();
	});

	it("leaves the session untouched when logout is cancelled or escaped", async () => {
		const user = userEvent.setup();
		getDefaultStore().set(sessionAtom, { kind: "ready", userId: me.id });
		renderOverlay();
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByTestId("open-logout"));
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByTestId("screen-settings")).toBeVisible();
		expect(getDefaultStore().get(sessionAtom)).toEqual({
			kind: "ready",
			userId: me.id,
		});
		await user.click(screen.getByTestId("open-logout"));
		await user.keyboard("{Escape}");
		expect(screen.getByTestId("screen-settings")).toBeVisible();
		expect(getDefaultStore().get(sessionAtom)).toEqual({
			kind: "ready",
			userId: me.id,
		});
	});

	it("logs out only after confirmation", async () => {
		const user = userEvent.setup();
		renderOverlay();
		await screen.findByTestId("screen-settings");
		await user.click(screen.getByTestId("open-logout"));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Log out",
			}),
		);
		expect(await screen.findByTestId("login-dest")).toBeVisible();
	});
});
