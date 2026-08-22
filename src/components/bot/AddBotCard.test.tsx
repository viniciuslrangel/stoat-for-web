import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { parseBotId } from "@/domain/ids";
import { AddBotCard } from "./AddBotCard";

vi.mock("@/hooks/useAddBot", () => ({
	useAddBot: vi.fn(),
}));

import { useAddBot } from "@/hooks/useAddBot";

function renderCard() {
	const rootRoute = createRootRoute({ component: Outlet });
	const botRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/bot/$code",
		component: function Bot() {
			return <AddBotCard code="demo-bot" />;
		},
	});
	const stubs = [
		"/login/auth",
		"/login",
		"/app",
		"/server/$serverId",
		"/channel/$channelId",
	].map((path) =>
		createRoute({
			getParentRoute: () => rootRoute,
			path,
			component: function Stub() {
				return null;
			},
		}),
	);
	const router = createRouter({
		routeTree: rootRoute.addChildren([botRoute, ...stubs]),
		history: createMemoryHistory({ initialEntries: ["/bot/demo-bot"] }),
	});
	return render(<RouterProvider router={router} />);
}

describe("AddBotCard", () => {
	it("renders a missing bot as a card with heading and Log in", async () => {
		vi.mocked(useAddBot).mockReturnValue({
			view: {
				status: "error",
				heading: "Bot not found",
				message: "This bot invite is invalid or the bot is not public.",
			},
			add: async () => null,
		});
		renderCard();
		expect(
			await screen.findByRole("heading", { name: "Bot not found" }),
		).toBeVisible();
		expect(
			screen.getByText("This bot invite is invalid or the bot is not public."),
		).toBeVisible();
		expect(screen.getByRole("link", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Decline" })).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Add bot", level: 1 }),
		).toBeNull();
	});

	it("shows the bot name and Log in when signed out", async () => {
		vi.mocked(useAddBot).mockReturnValue({
			view: {
				status: "ready",
				bot: {
					id: parseBotId("01BOT"),
					name: "Helper",
					avatarUrl: null,
					description: "Does chores.",
				},
				action: { kind: "login" },
			},
			add: async () => null,
		});
		renderCard();
		expect(
			await screen.findByRole("heading", { name: "Helper" }),
		).toBeVisible();
		expect(screen.getByText("Does chores.")).toBeVisible();
		expect(screen.getByRole("link", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Decline" })).toBeVisible();
	});

	it("shows Add and a destination picker when signed in", async () => {
		vi.mocked(useAddBot).mockReturnValue({
			view: {
				status: "ready",
				bot: {
					id: parseBotId("01BOT"),
					name: "Helper",
					avatarUrl: null,
					description: null,
				},
				action: {
					kind: "add",
					destinations: [{ id: "01SERVER", kind: "server", name: "Lounge" }],
					pending: false,
				},
			},
			add: async () => null,
		});
		renderCard();
		expect(
			await screen.findByRole("heading", { name: "Helper" }),
		).toBeVisible();
		expect(screen.getByLabelText("Add to")).toBeVisible();
		expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
		expect(screen.getByRole("link", { name: "Decline" })).toBeVisible();
	});
});
