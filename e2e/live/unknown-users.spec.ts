import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import {
	e2eServer,
	e2eUsername,
	hasEnvTest,
	loadGitignoredEnv,
} from "../helpers/env";

loadGitignoredEnv();

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const shotDir = resolve(root, ".audit/receipts/screenshots");
const receiptPath = resolve(root, ".audit/receipts/unknown-users.txt");
mkdirSync(shotDir, { recursive: true });

test.skip(!hasEnvTest(), "missing .env.test");
test.use({
	viewport: { width: 1440, height: 900 },
	baseURL: "http://localhost:3000",
});
test.setTimeout(120_000);

test("server channel shows real names not Unknown", async ({ page }) => {
	const { channelId } = e2eServer();
	const username = e2eUsername();
	const selfId = process.env.E2E_USER_ID;

	await loginViaUI(page);
	await page.goto(`/channel/${channelId}`);
	await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId("message-list")).toBeVisible({
		timeout: 60_000,
	});
	await page.waitForTimeout(3000);

	const report = await page.evaluate(() => {
		const messageList = document.querySelector('[data-testid="message-list"]');
		const memberList = document.querySelector('[data-testid="member-list"]');
		const msgText = (messageList?.textContent ?? "").trim();
		const unknownInMessages = (msgText.match(/\bUnknown\b/gi) ?? []).length;
		const chips = [
			...document.querySelectorAll('[data-testid="message-list"] *'),
		]
			.filter(
				(el) =>
					el.childNodes.length === 1 &&
					typeof el.textContent === "string" &&
					el.textContent.startsWith("@"),
			)
			.map((el) => el.textContent ?? "");
		const authorLabels = [
			...document.querySelectorAll('[data-testid="message-list"] .font-bold'),
		]
			.map((el) => el.textContent?.trim() ?? "")
			.filter(Boolean);
		const memberNames = [
			...document.querySelectorAll('[data-testid^="member-row-"] span'),
		]
			.map((el) => el.textContent?.trim() ?? "")
			.filter(Boolean);
		const systemBodies = [
			...document.querySelectorAll('[data-testid="system-message-body"]'),
		].map((el) => el.textContent?.trim() ?? "");
		return {
			title: document.title,
			url: location.href,
			heading: document.querySelector("h1")?.textContent?.trim() ?? null,
			hasAppShell: Boolean(document.querySelector('[data-testid="app-shell"]')),
			hasMessageList: Boolean(messageList),
			hasMemberList: Boolean(memberList),
			unknownInMessages,
			chips: [...new Set(chips)].slice(0, 30),
			authorLabels: [...new Set(authorLabels)].slice(0, 20),
			memberNames: memberNames.slice(0, 20),
			memberCount: memberNames.length,
			systemBodies: systemBodies.slice(0, 10),
			systemHasUnknown: systemBodies.some((text) => /\bUnknown\b/i.test(text)),
			memberHasUnknown: memberNames.some((name) => /^unknown$/i.test(name)),
		};
	});

	const shotPath = resolve(shotDir, "unknown-users-after.png");
	await page.screenshot({ path: shotPath, fullPage: false });

	const mentionTargetName =
		report.memberNames.find(
			(name) => name && !/^unknown$/i.test(name) && name.length > 2,
		) ?? username;
	let mentionCheck = null;

	const fromRow = await page.evaluate((name) => {
		for (const row of document.querySelectorAll(
			'[data-testid^="member-row-"]',
		)) {
			if ((row.textContent ?? "").includes(name)) {
				return (
					row.getAttribute("data-testid")?.replace("member-row-", "") ?? null
				);
			}
		}
		return null;
	}, mentionTargetName);
	const mentionTargetId = fromRow ?? selfId ?? null;

	if (mentionTargetId) {
		const composer = page.getByTestId("message-composer");
		const unique = `mention_${Date.now()}`;
		await composer.fill(`${unique} <@${mentionTargetId}>`);
		await composer.press("Enter");
		await expect(page.getByText(unique, { exact: false })).toBeVisible({
			timeout: 20_000,
		});
		await page.waitForTimeout(1000);
		mentionCheck = await page.evaluate((expectedName) => {
			const chips = [
				...document.querySelectorAll('[data-testid="message-list"] *'),
			]
				.filter(
					(el) =>
						el.childNodes.length === 1 &&
						typeof el.textContent === "string" &&
						el.textContent.startsWith("@"),
				)
				.map((el) => el.textContent ?? "");
			return {
				expectedName,
				chips: [...new Set(chips)].slice(0, 30),
				hasExpected: chips.some((chip) => chip === `@${expectedName}`),
				hasUnknownUser: chips.some((chip) => chip === "@Unknown user"),
			};
		}, mentionTargetName);
		await page.screenshot({
			path: resolve(shotDir, "unknown-users-mention.png"),
			fullPage: false,
		});
	}

	const payload = {
		pass: "PENDING",
		report,
		mentionCheck,
		shotPath,
	};

	const pass =
		report.hasAppShell &&
		report.hasMessageList &&
		report.unknownInMessages === 0 &&
		!report.authorLabels.some((label) => /^unknown$/i.test(label)) &&
		!report.memberHasUnknown &&
		!report.systemHasUnknown &&
		(mentionCheck
			? mentionCheck.hasExpected && !mentionCheck.hasUnknownUser
			: true);

	payload.pass = pass ? "PASS" : "FAIL";
	writeFileSync(receiptPath, `${JSON.stringify(payload, null, 2)}\n`);

	expect(report.hasAppShell, "app shell").toBe(true);
	expect(report.hasMessageList, "message list").toBe(true);
	expect(report.unknownInMessages, "Unknown in message text").toBe(0);
	expect(report.authorLabels.some((l) => /^unknown$/i.test(l))).toBe(false);
	expect(report.memberHasUnknown).toBe(false);
	expect(report.systemHasUnknown).toBe(false);
	if (mentionCheck) {
		expect(mentionCheck.hasExpected).toBe(true);
		expect(mentionCheck.hasUnknownUser).toBe(false);
	}
});
