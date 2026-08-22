import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(filePath) {
	if (!existsSync(filePath)) return;
	for (const line of readFileSync(filePath, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const value = trimmed
			.slice(eq + 1)
			.trim()
			.replace(/^["']|["']$/g, "");
		if (!(key in process.env)) process.env[key] = value;
	}
}
applyEnvFile(resolve(root, ".env.local"));
applyEnvFile(resolve(root, ".env.test"));

function required(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

const outDir = resolve(root, ".audit/receipts/screenshots");
mkdirSync(outDir, { recursive: true });
const base = process.env.AVATAR_GIF_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(`${base}/login/auth`, { waitUntil: "networkidle" });
await page.locator("#email").fill(required("E2E_EMAIL"));
await page.locator("#password").fill(required("E2E_PASSWORD"));
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.waitForSelector('[data-testid="rail-self-avatar"]', {
	timeout: 60_000,
});
await page.waitForTimeout(2000);

const img = page.locator(
	'[data-testid="rail-self-avatar"] [data-slot="avatar-image"]',
);
await img.waitFor({ state: "attached", timeout: 30_000 });
const src = await img.getAttribute("src");
if (!src) throw new Error("rail avatar image has no src");

const brokenPattern = src.replace(/\/original\/?$/, "");
const fixedLooksLikeOriginal = /\/original\/?$/.test(src) || src.includes("/original?");

async function probe(url) {
	const response = await page.request.get(url);
	const contentType = response.headers()["content-type"] ?? "";
	const buf = await response.body();
	const magic = buf.subarray(0, 6).toString("ascii");
	const isGifMagic = magic.startsWith("GIF87a") || magic.startsWith("GIF89a");
	return {
		status: response.status(),
		contentType,
		isGifMagic,
		bytes: buf.byteLength,
	};
}

const live = await probe(src);
let staticProbe = null;
if (fixedLooksLikeOriginal) {
	staticProbe = await probe(brokenPattern);
}

const shot = resolve(outDir, "avatar-gif-rail.png");
await page.locator('[data-testid="rail-self-avatar"]').screenshot({ path: shot });

const lines = [
	"avatar-gif",
	`base=${base}`,
	`page_url=${page.url()}`,
	`rail_img_src=${src}`,
	`broken_pattern=https://autumn.../avatars/{id}  (no /original; Autumn freezes GIF)`,
	`fixed_pattern=https://autumn.../avatars/{id}/original  (SDK animatedAvatarURL / createFileURL(true))`,
	`src_has_original=${fixedLooksLikeOriginal}`,
	`live_status=${live.status}`,
	`live_content_type=${live.contentType}`,
	`live_gif_magic=${live.isGifMagic}`,
	`live_bytes=${live.bytes}`,
	staticProbe
		? `static_without_original status=${staticProbe.status} content_type=${staticProbe.contentType} gif_magic=${staticProbe.isGifMagic} bytes=${staticProbe.bytes}`
		: "static_without_original=n/a",
	`screenshot=${shot}`,
	"note=PNG screenshot cannot prove animation frames; Content-Type / GIF magic is the proof.",
	`helper=src/lib/avatar-url.ts (autumnFileUrl, userAvatarUrlFromSdk, withAutumnOriginal)`,
];

const receipt = resolve(root, ".audit/receipts/avatar-gif.txt");
writeFileSync(receipt, lines.join("\n") + "\n");
console.log(readFileSync(receipt, "utf8"));

if (!live.isGifMagic && !live.contentType.includes("gif")) {
	console.warn(
		"WARN: live avatar may not be a GIF for this account; URL shape still checked.",
	);
}

await browser.close();
