import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import type { ReactNode } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vite-plus/test";

import { parseUserId } from "@/domain/ids";
import { sessionAtom } from "@/domain/session";
import { getStoatClient } from "@/lib/stoat-client";

import {
	botErrorCopy,
	listBotDestinations,
	parsePublicBot,
	useAddBot,
} from "./useAddBot";

vi.mock("@/lib/stoat-client", () => ({
	getStoatClient: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockClient() {
	vi.mocked(getStoatClient).mockReturnValue({
		initConfig: vi.fn().mockResolvedValue(undefined),
		configuration: {
			features: { autumn: { enabled: true, url: "http://cdn.test" } },
		},
		servers: {
			toList: () => [
				{
					id: "01SERVER",
					name: "Lounge",
					havePermission: () => true,
					getMember: () => undefined,
				},
			],
		},
		channels: {
			toList: () => [
				{
					id: "01GROUP",
					name: "Study",
					type: "Group",
					recipientIds: { has: () => false },
				},
			],
		},
	} as never);
}

describe("parsePublicBot", () => {
	it("reads username and autumn avatar", () => {
		expect(
			parsePublicBot(
				{
					_id: "01BOT",
					username: "Helper",
					avatar: "av1",
					description: "Does chores.",
				},
				"http://cdn.test",
			),
		).toEqual({
			id: "01BOT",
			name: "Helper",
			avatarUrl: "http://cdn.test/avatars/av1",
			description: "Does chores.",
		});
	});

	it("throws without a username", () => {
		expect(() => parsePublicBot({ _id: "01BOT" }, null)).toThrow(TypeError);
	});
});

describe("listBotDestinations", () => {
	it("keeps servers with ManageServer and groups without the bot", () => {
		const destinations = listBotDestinations(
			{
				servers: {
					toList: () => [
						{
							id: "01A",
							name: "Alpha",
							havePermission: () => true,
							getMember: () => undefined,
						},
						{
							id: "01B",
							name: "Beta",
							havePermission: () => false,
							getMember: () => undefined,
						},
					],
				},
				channels: {
					toList: () => [
						{
							id: "01G",
							name: "Study",
							type: "Group",
							recipientIds: { has: () => false },
						},
						{
							id: "01DM",
							name: "dm",
							type: "DirectMessage",
							recipientIds: { has: () => false },
						},
					],
				},
			} as never,
			"01BOT",
		);
		expect(destinations).toEqual([
			{ id: "01A", kind: "server", name: "Alpha" },
			{ id: "01G", kind: "group", name: "Study" },
		]);
	});
});

describe("botErrorCopy", () => {
	it("uses a not-found heading for 404", () => {
		expect(botErrorCopy(404, { type: "NotFound" })).toEqual({
			type: "NotFound",
			heading: "Bot not found",
			message: "This bot invite is invalid or the bot is not public.",
		});
	});
});

describe("useAddBot", () => {
	beforeEach(() => {
		getDefaultStore().set(sessionAtom, { kind: "anonymous" });
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				json: async () => ({ type: "NotFound" }),
			}),
		);
		mockClient();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows an error view for a missing bot", async () => {
		const { result } = renderHook(() => useAddBot("demo-bot"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("error");
		});
		expect(result.current.view).toMatchObject({
			status: "error",
			heading: "Bot not found",
		});
	});

	it("shows the bot name and a login action when signed out", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					_id: "01BOT",
					username: "Helper",
				}),
			}),
		);
		const { result } = renderHook(() => useAddBot("01BOT"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("ready");
		});
		expect(result.current.view).toMatchObject({
			status: "ready",
			bot: { name: "Helper" },
			action: { kind: "login" },
		});
	});

	it("lists destinations when signed in", async () => {
		getDefaultStore().set(sessionAtom, {
			kind: "ready",
			userId: parseUserId("01USER"),
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					_id: "01BOT",
					username: "Helper",
				}),
			}),
		);
		const { result } = renderHook(() => useAddBot("01BOT"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("ready");
		});
		expect(result.current.view).toMatchObject({
			action: {
				kind: "add",
				destinations: [
					{ id: "01SERVER", kind: "server", name: "Lounge" },
					{ id: "01GROUP", kind: "group", name: "Study" },
				],
			},
		});
	});
});
