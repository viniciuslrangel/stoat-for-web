import type { Page } from "@playwright/test";

import { e2eApiUrl, e2eCredentials } from "./env";

export type LoginSuccess = {
	result: "Success";
	_id: string;
	token: string;
	user_id: string;
};

export type LoginCredentials = {
	email: string;
	password: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseLoginSuccess(value: unknown): LoginSuccess {
	if (!isRecord(value)) {
		throw new Error("Login response was not an object");
	}
	if (value.result !== "Success") {
		throw new Error(`Login did not succeed: result=${String(value.result)}`);
	}
	if (typeof value.token !== "string" || value.token.length === 0) {
		throw new Error("Login succeeded without a token");
	}
	if (typeof value._id !== "string" || typeof value.user_id !== "string") {
		throw new Error("Login succeeded without session ids");
	}
	return {
		result: "Success",
		_id: value._id,
		token: value.token,
		user_id: value.user_id,
	};
}

export async function loginViaAPI(): Promise<LoginSuccess> {
	const { email, password } = e2eCredentials();

	const response = await fetch(`${e2eApiUrl()}/auth/session/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email,
			password,
			friendly_name: "Stoat E2E (Playwright)",
		}),
	});

	if (!response.ok) {
		throw new Error(`Login failed: ${response.status}`);
	}

	return parseLoginSuccess(await response.json());
}

export async function loginViaUI(
	page: Page,
	credentials: LoginCredentials = e2eCredentials(),
): Promise<void> {
	const { email, password } = credentials;

	await page.goto("/login/auth");
	await page.locator("#email").waitFor();
	await page.locator("#email").fill(email);
	await page.locator("#password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
	await page.waitForURL((url) => !url.pathname.includes("/login"), {
		timeout: 60_000,
	});
}
