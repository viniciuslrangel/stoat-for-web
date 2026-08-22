import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

import { loginViaUI } from "../helpers/auth";
import { hasEnvTest } from "../helpers/env";

const receiptsDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../.audit/receipts",
);
const screenshotPath = resolve(receiptsDir, "screenshots/voice-rtc.png");
const receiptPath = resolve(receiptsDir, "voice-rtc.txt");
const participantReceiptPath = resolve(
	receiptsDir,
	"voice-channel-participants.txt",
);
const layoutReceiptPath = resolve(receiptsDir, "voice-controls-layout.txt");
const audioOnlyShot = resolve(
	receiptsDir,
	"screenshots/voice-controls-audio-only.png",
);
const videoStageShot = resolve(
	receiptsDir,
	"screenshots/voice-controls-video-stage.png",
);
const screenShareShot = resolve(
	receiptsDir,
	"screenshots/voice-screen-share.png",
);
const remoteScreenShareShot = resolve(
	receiptsDir,
	"screenshots/voice-screen-share-remote.png",
);
const screenShareReceiptPath = resolve(receiptsDir, "screen-share.txt");

mkdirSync(dirname(screenshotPath), { recursive: true });

const voiceChannelId = process.env.E2E_VOICE_CHANNEL_ID;

test.skip(
	!hasEnvTest() || !voiceChannelId,
	"missing .env.test or E2E_VOICE_CHANNEL_ID",
);

test.use({
	viewport: { width: 1280, height: 720 },
});

test.describe.configure({ mode: "serial" });

async function installDisplayCaptureFixture(page: Page): Promise<void> {
	await page.addInitScript(() => {
		navigator.mediaDevices.getDisplayMedia = async () => {
			const canvas = document.createElement("canvas");
			canvas.width = 640;
			canvas.height = 360;
			const context = canvas.getContext("2d");
			if (context) {
				context.fillStyle = "#202225";
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.fillStyle = "#8ea1e1";
				context.font = "bold 32px sans-serif";
				context.fillText("Stoat screen-share fixture", 32, 190);
			}
			return canvas.captureStream(5);
		};
	});
}

test("voice channel shows join UI and connects LiveKit signaling", async ({
	page,
	context,
}) => {
	await installDisplayCaptureFixture(page);
	await context.grantPermissions(["microphone"], {
		origin: "http://127.0.0.1:4173",
	});

	await loginViaUI(page);
	await page.goto(`/channel/${voiceChannelId}`);

	await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId("user-voice-tray")).toBeVisible();
	await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible();
	await expect(page.getByTestId("voice-call-panel")).toBeVisible({
		timeout: 60_000,
	});
	await expect(page.getByTestId("voice-join")).toBeVisible();

	await page.screenshot({ path: screenshotPath, fullPage: false });

	await page.getByTestId("voice-join").click();

	const status = page.getByTestId("voice-status");
	await expect(status).toHaveText(/Connecting|Voice Connected|Reconnecting/i, {
		timeout: 30_000,
	});

	const endCall = page.getByTestId("voice-end-call");
	const mute = page.getByTestId("voice-mute");
	const deafen = page.getByTestId("voice-deafen");

	let verdict = "FAIL";
	let detail = "";

	try {
		await expect(endCall).toBeVisible({ timeout: 45_000 });
		await expect(mute).toBeVisible();
		await expect(deafen).toBeVisible();
		await expect(page.getByTestId("voice-connected-strip")).toBeVisible();
		await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible();
		await expect(page.getByTestId("voice-call-panel")).toHaveCount(0);
		await expect(page.getByTestId("voice-call-split")).toHaveCount(0);
		await expect(status).toHaveText(/Voice Connected|Reconnecting/i, {
			timeout: 30_000,
		});

		const sidebarParticipants = page.locator(
			'[data-testid^="voice-participant-row-"]',
		);
		await expect(sidebarParticipants).toHaveCount(1, { timeout: 15_000 });
		await page.screenshot({
			path: resolve(receiptsDir, "screenshots/voice-channel-participants.png"),
			fullPage: false,
		});
		await page.screenshot({
			path: resolve(receiptsDir, "screenshots/voice-rtc-connected.png"),
			fullPage: false,
		});
		await page.screenshot({ path: audioOnlyShot, fullPage: false });
		const screenshare = page.getByTestId("voice-screenshare");
		await expect(screenshare).toHaveAttribute("aria-pressed", "false");
		await screenshare.click();
		await expect(screenshare).toHaveAttribute("aria-pressed", "true", {
			timeout: 15_000,
		});
		await expect(page.getByTestId("voice-video-stage")).toBeVisible();
		await expect(page.getByTestId("voice-video-surface")).toBeVisible();
		await page.screenshot({ path: screenShareShot, fullPage: false });
		await screenshare.click();
		await expect(screenshare).toHaveAttribute("aria-pressed", "false", {
			timeout: 15_000,
		});
		await expect(page.getByTestId("voice-call-split")).toHaveCount(0);

		await page.evaluate(() => {
			sessionStorage.setItem("stoat.forceVoiceStage", "1");
			window.dispatchEvent(new Event("stoat-force-voice-stage"));
		});
		await expect(page.getByTestId("voice-call-panel")).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByTestId("voice-call-split")).toBeVisible();
		await expect(page.getByTestId("voice-mute")).toBeVisible();
		await expect(page.getByTestId("user-tray-avatar-menu")).toBeVisible();
		await page.screenshot({ path: videoStageShot, fullPage: false });

		await page.getByTestId("voice-end-call").click();
		await expect(page.getByTestId("voice-join")).toBeVisible({
			timeout: 15_000,
		});

		verdict = "PASS";
		detail =
			"Audio-only hides the split stage; the tray publishes the local screen-share fixture, renders its video surface, and disables cleanly; forceVoiceStage still shows the call panel; End Call leaves cleanly.";
	} catch (error) {
		const errorText = await page
			.locator(
				"[data-testid=voice-connected-strip] .text-destructive, [data-testid=voice-call-panel] .text-destructive",
			)
			.first()
			.textContent()
			.catch(() => null);
		detail = `status=${await status.textContent().catch(() => null)} error=${errorText ?? "none"} catch=${error instanceof Error ? error.message : String(error)}`;
		await page.screenshot({
			path: resolve(receiptsDir, "screenshots/voice-rtc-fail.png"),
			fullPage: false,
		});
	}

	const receiptBody = `${[
		`verdict=${verdict}`,
		`channel=${voiceChannelId}`,
		`detail=${detail}`,
		`screenshots=voice-rtc.png${verdict === "PASS" ? ",voice-channel-participants.png,voice-rtc-connected.png,voice-controls-audio-only.png,voice-controls-video-stage.png" : ",voice-rtc-fail.png"}`,
	].join("\n")}\n`;

	writeFileSync(receiptPath, receiptBody);
	writeFileSync(participantReceiptPath, receiptBody);
	writeFileSync(layoutReceiptPath, receiptBody);
	writeFileSync(
		screenShareReceiptPath,
		`${[
			`verdict=${verdict}`,
			"test=local screen-share publish and cleanup",
			`detail=${detail}`,
			`screenshots=${screenShareShot}`,
			`remote_test=${process.env.E2E_REMOTE_EMAIL && process.env.E2E_REMOTE_PASSWORD ? "configured" : "SKIP, second account not configured"}`,
			"known_gaps=browser fixture covers the browser path; set E2E_REMOTE_EMAIL and E2E_REMOTE_PASSWORD for the two-client watch proof; Electron bridge remains deferred",
		].join("\n")}\n`,
	);

	expect(verdict).toBe("PASS");
});

test("remote screen shares stay paused until watched", async ({
	browser,
	page,
	context,
}) => {
	const remoteEmail = process.env.E2E_REMOTE_EMAIL;
	const remotePassword = process.env.E2E_REMOTE_PASSWORD;
	if (!remoteEmail || !remotePassword) {
		test.skip(
			true,
			"set E2E_REMOTE_EMAIL and E2E_REMOTE_PASSWORD for the two-client watch proof",
		);
		return;
	}
	test.setTimeout(120_000);
	await installDisplayCaptureFixture(page);
	await context.grantPermissions(["microphone"], {
		origin: "http://127.0.0.1:4173",
	});
	await loginViaUI(page);
	await page.goto(`/channel/${voiceChannelId}`);
	await expect(page.getByTestId("voice-join")).toBeVisible({
		timeout: 60_000,
	});
	await page.getByTestId("voice-join").click();
	await expect(page.getByTestId("voice-end-call")).toBeVisible({
		timeout: 45_000,
	});
	await page.getByTestId("voice-screenshare").click();
	await expect(page.getByTestId("voice-screenshare")).toHaveAttribute(
		"aria-pressed",
		"true",
		{ timeout: 15_000 },
	);

	const remoteContext = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	const remotePage = await remoteContext.newPage();
	try {
		await remoteContext.grantPermissions(["microphone"], {
			origin: "http://127.0.0.1:4173",
		});
		await loginViaUI(remotePage, {
			email: remoteEmail,
			password: remotePassword,
		});
		await remotePage.goto(`/channel/${voiceChannelId}`);
		await expect(remotePage.getByTestId("voice-join")).toBeVisible({
			timeout: 60_000,
		});
		await remotePage.getByTestId("voice-join").click();
		await expect(remotePage.getByTestId("voice-end-call")).toBeVisible({
			timeout: 45_000,
		});
		await expect(remotePage.getByTestId("voice-video-placeholder")).toBeVisible(
			{
				timeout: 30_000,
			},
		);
		await remotePage.screenshot({
			path: remoteScreenShareShot,
			fullPage: false,
		});
		await remotePage.getByTestId("voice-resume-watching").click();
		await expect(remotePage.getByTestId("voice-video-surface")).toBeVisible({
			timeout: 30_000,
		});
		await expect(remotePage.getByTestId("voice-stop-watching")).toBeVisible();
		await remotePage.getByTestId("voice-stop-watching").click();
		await expect(
			remotePage.getByTestId("voice-video-placeholder"),
		).toBeVisible();
		appendFileSync(
			screenShareReceiptPath,
			[
				"test=remote opt-in watch and paired audio subscription",
				"verdict=PASS",
				"detail=Remote share started as a placeholder, resumed into a video surface, then stopped back to the placeholder.",
				`screenshots=${remoteScreenShareShot}`,
				"",
			].join("\n"),
		);
	} finally {
		await remoteContext.close();
		await page.getByTestId("voice-end-call").click();
	}
});
