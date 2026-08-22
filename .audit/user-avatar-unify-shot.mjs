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
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const channelId = required("E2E_CHANNEL_ID");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(`${base}/login/auth`, { waitUntil: "networkidle" });
await page.locator("#email").fill(required("E2E_EMAIL"));
await page.locator("#password").fill(required("E2E_PASSWORD"));
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL((url) => !url.pathname.includes("/login"), {
	timeout: 60_000,
});
await page.waitForSelector('[data-testid="app-shell"]', { timeout: 60_000 });

await page.goto(`${base}/channel/${channelId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="message-list"]', { timeout: 60_000 });

const membersToggle = page.getByRole("button", { name: /members/i });
if (await membersToggle.isVisible().catch(() => false)) {
	const memberListVisible = await page
		.locator('[data-testid="member-list"]')
		.isVisible()
		.catch(() => false);
	if (!memberListVisible) {
		await membersToggle.click();
	}
}
await page.waitForSelector('[data-testid="member-list"]', { timeout: 30_000 });
await page.waitForTimeout(1200);

const metrics = await page.evaluate(() => {
	function faceClass(avatar) {
		return avatar?.className ?? "";
	}
	function hasThickFaceBorder(cls) {
		return (
			/(?:^|\s)border-\[3px\](?:\s|$)/.test(cls) &&
			/(?:^|\s)border-border(?:\s|$)/.test(cls)
		);
	}

	const memberRows = [
		...document.querySelectorAll('[data-testid^="member-row-"]'),
	];
	const memberAvatars = memberRows.map((row) => {
		const avatar = row.querySelector('[data-slot="avatar"]');
		const badge = row.querySelector('[data-testid="presence-badge"]');
		const cls = faceClass(avatar);
		return {
			hasAvatar: Boolean(avatar),
			roundedFull: cls.includes("rounded-full"),
			thickFaceBorder: hasThickFaceBorder(cls),
			roundedSm: cls.includes("rounded-sm"),
			hairlineOff: cls.includes("after:hidden"),
			badgeCutoutSidebar: badge?.className.includes("border-sidebar") ?? false,
			badgePresence: badge?.getAttribute("data-presence") ?? null,
			badgeBorderWidth: badge ? getComputedStyle(badge).borderWidth : null,
		};
	});

	const authorAvatars = [
		...document.querySelectorAll(
			'[data-testid="message-author-avatar"] [data-slot="avatar"]',
		),
	].map((avatar) => {
		const badge = avatar.querySelector('[data-testid="presence-badge"]');
		const cls = faceClass(avatar);
		return {
			roundedFull: cls.includes("rounded-full"),
			thickFaceBorder: hasThickFaceBorder(cls),
			roundedSm: cls.includes("rounded-sm"),
			hasBadge: Boolean(badge),
			badgeCutoutBackground:
				badge?.className.includes("border-background") ?? false,
		};
	});

	const railSelf = document.querySelector(
		'[data-testid="rail-self-avatar"] [data-slot="avatar"]',
	);
	const railBadge = document.querySelector(
		'[data-testid="rail-self-avatar"] [data-testid="presence-badge"]',
	);
	const trayAvatar = document.querySelector(
		'[data-testid="user-tray-avatar-menu"] [data-slot="avatar"]',
	);
	const trayBadge = document.querySelector(
		'[data-testid="user-tray-avatar-menu"] [data-testid="presence-badge"]',
	);

	return {
		memberCount: memberRows.length,
		memberAvatars,
		authorCount: authorAvatars.length,
		authorAvatars,
		railSelf: railSelf
			? {
					roundedFull: faceClass(railSelf).includes("rounded-full"),
					thickFaceBorder: hasThickFaceBorder(faceClass(railSelf)),
					cutoutInk: railBadge?.className.includes("border-ink") ?? false,
				}
			: null,
		tray: trayAvatar
			? {
					roundedFull: faceClass(trayAvatar).includes("rounded-full"),
					thickFaceBorder: hasThickFaceBorder(faceClass(trayAvatar)),
					cutoutSidebar: trayBadge?.className.includes("border-sidebar") ?? false,
					menuTrigger: Boolean(
						document.querySelector('[data-testid="user-tray-avatar-menu"]'),
					),
					settingsLink: Boolean(
						document.querySelector('[data-testid="user-tray-settings"]'),
					),
				}
			: null,
	};
});

const memberShot = resolve(outDir, "user-avatar-member-list.png");
await page.locator('[data-testid="member-list"]').screenshot({ path: memberShot });

const messagesShot = resolve(outDir, "user-avatar-message-authors.png");
await page.locator('[data-testid="message-list"]').screenshot({ path: messagesShot });

const trayShot = resolve(outDir, "user-avatar-user-tray.png");
const trayCard = page.locator('[data-testid="user-tray-card"]');
if (await trayCard.isVisible().catch(() => false)) {
	await trayCard.screenshot({ path: trayShot });
}

const badMembers = metrics.memberAvatars.filter(
	(a) => a.thickFaceBorder || a.roundedSm || !a.roundedFull,
);
const badAuthors = metrics.authorAvatars.filter(
	(a) => a.thickFaceBorder || a.roundedSm || !a.roundedFull,
);
const onlineMembers = metrics.memberAvatars.filter(
	(a) => a.badgePresence && a.badgePresence !== "Invisible",
);
const sidebarCutoutOk =
	onlineMembers.length === 0 ||
	onlineMembers.every((a) => a.badgeCutoutSidebar);

const trayOk =
	metrics.tray != null &&
	metrics.tray.roundedFull &&
	!metrics.tray.thickFaceBorder &&
	metrics.tray.menuTrigger &&
	metrics.tray.settingsLink;

const pass =
	metrics.memberCount > 0 &&
	badMembers.length === 0 &&
	badAuthors.length === 0 &&
	sidebarCutoutOk &&
	trayOk &&
	(metrics.railSelf == null ||
		(metrics.railSelf.roundedFull && !metrics.railSelf.thickFaceBorder));

const receipt = [
	"user-avatar-unify",
	`verdict=${pass ? "PASS" : "FAIL"}`,
	`url=${page.url()}`,
	`member_shot=${memberShot}`,
	`messages_shot=${messagesShot}`,
	`tray_shot=${trayShot}`,
	`member_rows=${metrics.memberCount}`,
	`author_avatars=${metrics.authorCount}`,
	`bad_members=${badMembers.length}`,
	`bad_authors=${badAuthors.length}`,
	`sidebar_cutout_ok=${sidebarCutoutOk}`,
	`online_member_sample=${JSON.stringify(onlineMembers[0] ?? null)}`,
	`tray=${JSON.stringify(metrics.tray)}`,
	`rail_self=${JSON.stringify(metrics.railSelf)}`,
	"stacking=UserAvatar circular face + surface-colored pip border cutout; after:border off when pip shown",
	"entities=EntityAvatar for server/group/bot/invite; lib/display-initials shared",
	"tray=UserAccountMenu uses shared UserAvatar; settings gear + mute/deafen/hangup remain UserVoiceTray",
].join("\n");

writeFileSync(resolve(root, ".audit/receipts/user-avatar-unify.txt"), `${receipt}\n`);
console.log(receipt);

await browser.close();
if (!pass) process.exit(1);
