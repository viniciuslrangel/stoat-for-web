import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AuthShell } from "@/components/auth/AuthShell";
import { CheckEmailCard } from "@/components/auth/CheckEmailCard";
import { DeleteAccountCard } from "@/components/auth/DeleteAccountCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResendForm } from "@/components/auth/ResendForm";
import { ResetConfirmForm } from "@/components/auth/ResetConfirmForm";
import { ResetForm } from "@/components/auth/ResetForm";
import { VerifyCard } from "@/components/auth/VerifyCard";
import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { authFeaturesQueryKey } from "@/lib/auth-features";

vi.mock("@/lib/verify-email", () => ({
	verifyAccount: vi
		.fn()
		.mockResolvedValue({ kind: "success", mfaTicket: null }),
	loginWithTicket: vi.fn(),
}));

vi.mock("@/lib/delete-account", () => ({
	deleteAccountByToken: vi.fn().mockResolvedValue(undefined),
}));

function providers(ui: ReactNode, inviteOnly = true) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});
	client.setQueryData(authFeaturesQueryKey, {
		inviteOnly,
		emailVerification: false,
		captchaSiteKey: null,
	});
	const rootRoute = createRootRoute({
		component: function Root() {
			return (
				<QueryClientProvider client={client}>
					<Outlet />
				</QueryClientProvider>
			);
		},
	});
	const pageRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: function Page() {
			return ui;
		},
	});
	const stubs = ["/login", "/login/auth", "/login/check", "/app"].map((path) =>
		createRoute({
			getParentRoute: () => rootRoute,
			path,
			component: function Stub() {
				return null;
			},
		}),
	);
	const router = createRouter({
		routeTree: rootRoute.addChildren([pageRoute, ...stubs]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return render(<RouterProvider router={router} />);
}

describe("register screens", () => {
	it("shows email, password, invite, and Register", async () => {
		providers(
			<AuthShell testId="screen-register">
				<RegisterForm title="Create account" />
			</AuthShell>,
		);
		expect(await screen.findByTestId("screen-register")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Create account" }),
		).toBeVisible();
		expect(screen.getByLabelText("Email")).toBeVisible();
		expect(screen.getByLabelText("Password")).toBeVisible();
		expect(screen.getByLabelText("Invite code")).toBeVisible();
		expect(screen.getByRole("button", { name: "Register" })).toBeVisible();
	});

	it("prefills the invite code on the invite route card", async () => {
		providers(
			<AuthShell testId="screen-register-invite">
				<RegisterForm
					inviteCode="demo-invite"
					title="Create account with invite"
				/>
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", {
				name: "Create account with invite",
			}),
		).toBeVisible();
		expect(screen.getByLabelText("Invite code")).toHaveValue("demo-invite");
	});

	it("hides the invite field when the instance is not invite-only", async () => {
		providers(
			<AuthShell testId="screen-register">
				<RegisterForm title="Create account" />
			</AuthShell>,
			false,
		);
		expect(await screen.findByLabelText("Email")).toBeVisible();
		expect(screen.queryByLabelText("Invite code")).toBeNull();
	});
});

describe("check email", () => {
	beforeEach(() => {
		getDefaultStore().set(pendingCheckEmailAtom, null);
	});

	it("shows a card with a heading and back link", async () => {
		providers(
			<AuthShell testId="screen-check-email">
				<CheckEmailCard />
			</AuthShell>,
		);
		expect(await screen.findByTestId("screen-check-email")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Check your email" }),
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Go back to login" }),
		).toBeVisible();
	});

	it("offers a webmail button for a known domain", async () => {
		getDefaultStore().set(pendingCheckEmailAtom, "me@gmail.com");
		providers(
			<AuthShell testId="screen-check-email">
				<CheckEmailCard />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("link", { name: "Open Gmail" }),
		).toBeVisible();
	});
});

describe("resend and reset forms", () => {
	it("resend shows an email field", async () => {
		providers(
			<AuthShell testId="screen-resend">
				<ResendForm />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", { name: "Resend verification" }),
		).toBeVisible();
		expect(screen.getByLabelText("Email")).toBeVisible();
		expect(screen.getByRole("button", { name: "Resend" })).toBeVisible();
	});

	it("reset shows an email field", async () => {
		providers(
			<AuthShell testId="screen-reset">
				<ResetForm />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", { name: "Reset password" }),
		).toBeVisible();
		expect(screen.getByLabelText("Email")).toBeVisible();
		expect(screen.getByRole("button", { name: "Reset" })).toBeVisible();
	});

	it("reset confirm shows a new password field and log-out checkbox", async () => {
		providers(
			<AuthShell testId="screen-reset-confirm">
				<ResetConfirmForm token="demo-token" />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", { name: "Set new password" }),
		).toBeVisible();
		expect(screen.getByLabelText("New password")).toBeVisible();
		expect(
			screen.getByRole("checkbox", { name: "Log out of other sessions" }),
		).toBeVisible();
	});
});

describe("verify and delete cards", () => {
	it("verify shows the heading and a login path after success without a ticket", async () => {
		providers(
			<AuthShell testId="screen-verify">
				<VerifyCard token="demo-token" />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", { name: "Verify email" }),
		).toBeVisible();
		expect(await screen.findByRole("link", { name: "Log in" })).toBeVisible();
	});

	it("delete shows the heading and a card body", async () => {
		providers(
			<AuthShell testId="screen-delete-account">
				<DeleteAccountCard token="demo-token" />
			</AuthShell>,
		);
		expect(
			await screen.findByRole("heading", { name: "Delete account" }),
		).toBeVisible();
		expect(
			await screen.findByText("Account has been queued for deletion."),
		).toBeVisible();
	});
});
