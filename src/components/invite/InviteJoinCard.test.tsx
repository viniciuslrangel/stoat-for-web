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

import { parseServerId } from "@/domain/ids";
import { InviteJoinCard } from "./InviteJoinCard";

vi.mock("@/hooks/useInvite", () => ({
	useInvite: vi.fn(),
}));

import { useInvite } from "@/hooks/useInvite";

function renderCard() {
	const rootRoute = createRootRoute({ component: Outlet });
	const inviteRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/invite/$code",
		component: function Invite() {
			return <InviteJoinCard code="demo-invite" />;
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
		routeTree: rootRoute.addChildren([inviteRoute, ...stubs]),
		history: createMemoryHistory({ initialEntries: ["/invite/demo-invite"] }),
	});
	return render(<RouterProvider router={router} />);
}

describe("InviteJoinCard", () => {
	it("renders an invalid invite as a card with heading and Log in", async () => {
		vi.mocked(useInvite).mockReturnValue({
			view: {
				status: "error",
				heading: "Invite invalid",
				message:
					"This invite may be expired, or you might not have permission to join.",
			},
			accept: async () => null,
		});
		renderCard();
		expect(
			await screen.findByRole("heading", { name: "Invite invalid" }),
		).toBeVisible();
		expect(
			screen.getByText(
				"This invite may be expired, or you might not have permission to join.",
			),
		).toBeVisible();
		expect(screen.getByRole("link", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Decline" })).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Invite", level: 1 }),
		).toBeNull();
	});

	it("shows the server name and Log in when signed out", async () => {
		vi.mocked(useInvite).mockReturnValue({
			view: {
				status: "ready",
				invite: {
					code: "abc123" as never,
					name: "Lounge",
					iconUrl: null,
					bannerUrl: null,
					memberCount: 12,
					inviterName: "ada",
					alreadyMember: false,
					destination: { kind: "server", id: parseServerId("01SERVER") },
				},
				action: { kind: "login" },
			},
			accept: async () => null,
		});
		renderCard();
		expect(
			await screen.findByRole("heading", { name: "Lounge" }),
		).toBeVisible();
		expect(screen.getByText("12 members")).toBeVisible();
		expect(screen.getByRole("link", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Decline" })).toBeVisible();
	});
});
