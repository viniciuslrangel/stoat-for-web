export const USER_SETTINGS_PAGE_IDS = [
	"account",
	"appearance",
	"voice",
] as const;

export type UserSettingsPageId = (typeof USER_SETTINGS_PAGE_IDS)[number];

export const DEFAULT_USER_SETTINGS_PAGE =
	"account" satisfies UserSettingsPageId;

export type UserSettingsGroup = {
	readonly id: "user" | "app";
	readonly title: string;
	readonly pages: readonly {
		readonly id: UserSettingsPageId;
		readonly label: string;
	}[];
};

export const USER_SETTINGS_GROUPS = [
	{
		id: "user",
		title: "User settings",
		pages: [{ id: "account", label: "My Account" }],
	},
	{
		id: "app",
		title: "App settings",
		pages: [
			{ id: "appearance", label: "Appearance" },
			{ id: "voice", label: "Voice" },
		],
	},
] as const satisfies readonly UserSettingsGroup[];

const PAGE_IDS: ReadonlySet<string> = new Set(USER_SETTINGS_PAGE_IDS);

export function isUserSettingsPageId(
	value: string,
): value is UserSettingsPageId {
	return PAGE_IDS.has(value);
}

export const THEME_CHOICES = [
	{ id: "light", label: "Light" },
	{ id: "dark", label: "Dark" },
	{ id: "system", label: "Sync with computer" },
] as const;

export type ThemeChoiceId = (typeof THEME_CHOICES)[number]["id"];
