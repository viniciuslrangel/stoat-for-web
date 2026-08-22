import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { DiscoverUnavailable } from "./DiscoverUnavailable";

function renderDiscover() {
	const rootRoute = createRootRoute({
		component: Outlet,
	});
	const discoverRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: function Discover() {
			return <DiscoverUnavailable loading={false} />;
		},
	});
	const homeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/app",
		component: function Home() {
			return null;
		},
	});
	const friendsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/friends",
		component: function Friends() {
			return null;
		},
	});
	const routeTree = rootRoute.addChildren([
		discoverRoute,
		homeRoute,
		friendsRoute,
	]);
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return render(<RouterProvider router={router} />);
}

describe("DiscoverUnavailable", () => {
	it("explains Discover is unavailable and links Home and Friends", async () => {
		renderDiscover();
		expect(await screen.findByTestId("screen-discover")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Discover isn't available here" }),
		).toBeVisible();
		expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
			"href",
			"/app",
		);
		expect(screen.getByRole("link", { name: /Friends/ })).toHaveAttribute(
			"href",
			"/friends",
		);
	});
});
