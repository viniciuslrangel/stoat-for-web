export type ScreenDef = {
	readonly id: string;
	readonly path: string;
	readonly samplePath: string;
	readonly title: string;
	readonly routeFile: string;
};

export const screens = [
	{
		id: "welcome",
		path: "/login/",
		samplePath: "/login",
		title: "Welcome",
		routeFile: "src/routes/login/index.tsx",
	},
	{
		id: "login",
		path: "/login/auth",
		samplePath: "/login/auth",
		title: "Log in",
		routeFile: "src/routes/login/auth.tsx",
	},
	{
		id: "register",
		path: "/login/create/",
		samplePath: "/login/create",
		title: "Create account",
		routeFile: "src/routes/login/create.index.tsx",
	},
	{
		id: "register-invite",
		path: "/login/create/$code",
		samplePath: "/login/create/demo-invite",
		title: "Create account with invite",
		routeFile: "src/routes/login/create.$code.tsx",
	},
	{
		id: "check-email",
		path: "/login/check",
		samplePath: "/login/check",
		title: "Check your email",
		routeFile: "src/routes/login/check.tsx",
	},
	{
		id: "resend",
		path: "/login/resend",
		samplePath: "/login/resend",
		title: "Resend verification",
		routeFile: "src/routes/login/resend.tsx",
	},
	{
		id: "reset",
		path: "/login/reset/",
		samplePath: "/login/reset",
		title: "Reset password",
		routeFile: "src/routes/login/reset.index.tsx",
	},
	{
		id: "reset-confirm",
		path: "/login/reset/$token",
		samplePath: "/login/reset/demo-token",
		title: "Set new password",
		routeFile: "src/routes/login/reset.$token.tsx",
	},
	{
		id: "verify",
		path: "/login/verify/$token",
		samplePath: "/login/verify/demo-token",
		title: "Verify email",
		routeFile: "src/routes/login/verify.$token.tsx",
	},
	{
		id: "delete-account",
		path: "/login/delete/$token",
		samplePath: "/login/delete/demo-token",
		title: "Delete account",
		routeFile: "src/routes/login/delete.$token.tsx",
	},
	{
		id: "home",
		path: "/app",
		samplePath: "/app",
		title: "Home",
		routeFile: "src/routes/app.tsx",
	},
	{
		id: "friends",
		path: "/friends",
		samplePath: "/friends",
		title: "Friends",
		routeFile: "src/routes/friends.tsx",
	},
	{
		id: "discover",
		path: "/discover/$",
		samplePath: "/discover",
		title: "Discover",
		routeFile: "src/routes/discover.$.tsx",
	},
	{
		id: "settings",
		path: "/settings",
		samplePath: "/settings",
		title: "Settings",
		routeFile: "src/routes/settings.tsx",
	},
	{
		id: "server-home",
		path: "/server/$serverId",
		samplePath: "/server/demo-server",
		title: "Server",
		routeFile: "src/routes/server.$serverId.tsx",
	},
	{
		id: "channel",
		path: "/channel/$channelId/",
		samplePath: "/channel/demo-channel",
		title: "Channel",
		routeFile: "src/routes/channel.$channelId.index.tsx",
	},
	{
		id: "channel-message",
		path: "/channel/$channelId/$messageId",
		samplePath: "/channel/demo-channel/demo-message",
		title: "Channel message",
		routeFile: "src/routes/channel.$channelId.$messageId.tsx",
	},
	{
		id: "invite",
		path: "/invite/$code",
		samplePath: "/invite/demo-invite",
		title: "Invite",
		routeFile: "src/routes/invite.$code.tsx",
	},
	{
		id: "add-bot",
		path: "/bot/$code",
		samplePath: "/bot/demo-bot",
		title: "Add bot",
		routeFile: "src/routes/bot.$code.tsx",
	},
] as const satisfies readonly ScreenDef[];

export type ScreenId = (typeof screens)[number]["id"];
