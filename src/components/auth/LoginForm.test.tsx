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

import { AuthShell } from "./AuthShell";
import { LoginForm } from "./LoginForm";
import { WelcomeCard } from "./WelcomeCard";

function renderAuth(path: string) {
	const rootRoute = createRootRoute({
		component: Outlet,
	});
	const welcomeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/login/",
		component: function Welcome() {
			return (
				<AuthShell testId="screen-welcome">
					<WelcomeCard />
				</AuthShell>
			);
		},
	});
	const loginRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/login/auth",
		component: function Login() {
			return (
				<AuthShell testId="screen-login">
					<LoginForm />
				</AuthShell>
			);
		},
	});
	const stubs = [
		"/login/create",
		"/login/reset",
		"/login/resend",
		"/login",
		"/app",
	].map((stubPath) =>
		createRoute({
			getParentRoute: () => rootRoute,
			path: stubPath,
			component: function Stub() {
				return null;
			},
		}),
	);
	const routeTree = rootRoute.addChildren([welcomeRoute, loginRoute, ...stubs]);
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
	});
	return render(<RouterProvider router={router} />);
}

describe("welcome screen", () => {
	it("shows Log in and Sign up, not just a title", async () => {
		renderAuth("/login/");
		expect(await screen.findByTestId("screen-welcome")).toBeVisible();
		expect(screen.getByRole("heading", { name: "Stoat" })).toBeVisible();
		expect(screen.getByText("Welcome")).toBeVisible();
		expect(screen.getByRole("link", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Sign up" })).toBeVisible();
	});
});

describe("login screen", () => {
	it("shows a form with email, password, and Log in", async () => {
		renderAuth("/login/auth");
		expect(await screen.findByTestId("screen-login")).toBeVisible();
		expect(screen.getByRole("heading", { name: "Log in" })).toBeVisible();
		expect(screen.getByLabelText("Email")).toBeVisible();
		expect(screen.getByLabelText("Password")).toBeVisible();
		expect(screen.getByRole("button", { name: "Log in" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Back" })).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Need an account? Register" }),
		).toBeVisible();
	});
});
