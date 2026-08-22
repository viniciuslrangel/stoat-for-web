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

import { parseServerId, parseUserId } from "@/domain/ids";
import { sessionAtom } from "@/domain/session";
import { getStoatClient } from "@/lib/stoat-client";

import {
	hydrateInviteJoin,
	inviteErrorCopy,
	parseInviteJoin,
	parseInviteResponse,
	useInvite,
} from "./useInvite";

vi.mock("@/lib/stoat-client", () => ({
	getStoatClient: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockClient(memberIds: string[] = []) {
	const members = new Set(memberIds);
	vi.mocked(getStoatClient).mockReturnValue({
		initConfig: vi.fn().mockResolvedValue(undefined),
		configuration: {
			features: { autumn: { enabled: true, url: "http://cdn.test" } },
		},
		servers: {
			has: (id: string) => members.has(id),
			getOrCreate: vi.fn(),
		},
		channels: {
			has: (id: string) => members.has(id),
			getOrCreate: vi.fn(),
		},
	} as never);
}

describe("parseInviteResponse", () => {
	it("reads a server invite and autumn icon", () => {
		expect(
			parseInviteResponse(
				{
					type: "Server",
					code: "abc123",
					server_id: "01SERVER",
					server_name: " Lounge ",
					server_icon: { _id: "icon1", tag: "icons" },
					server_banner: { _id: "ban1", tag: "banners" },
					channel_id: "01CHANNEL",
					channel_name: "general",
					user_name: "ada",
					member_count: 12,
				},
				{
					autumnBase: "http://cdn.test",
					isMember: () => false,
				},
			),
		).toEqual({
			code: "abc123",
			name: "Lounge",
			iconUrl: "http://cdn.test/icons/icon1",
			bannerUrl: "http://cdn.test/banners/ban1",
			memberCount: 12,
			inviterName: "ada",
			alreadyMember: false,
			destination: { kind: "server", id: parseServerId("01SERVER") },
		});
	});

	it("marks already-member from the membership check", () => {
		const preview = parseInviteResponse(
			{
				type: "Server",
				code: "abc123",
				server_id: "01SERVER",
				server_name: "Lounge",
				channel_id: "01CHANNEL",
				channel_name: "general",
				user_name: "ada",
				member_count: 1,
			},
			{
				autumnBase: null,
				isMember: (id) => id === "01SERVER",
			},
		);
		expect(preview.alreadyMember).toBe(true);
	});

	it("reads a group invite", () => {
		const preview = parseInviteResponse(
			{
				type: "Group",
				code: "grp1",
				channel_id: "01GROUP",
				channel_name: "Study",
				user_name: "ada",
			},
			{ autumnBase: null, isMember: () => false },
		);
		expect(preview.destination).toEqual({ kind: "group", id: "01GROUP" });
		expect(preview.name).toBe("Study");
	});

	it("throws on missing server name", () => {
		expect(() =>
			parseInviteResponse(
				{ type: "Server", code: "x", server_id: "01S" },
				{ autumnBase: null, isMember: () => false },
			),
		).toThrow(TypeError);
	});
});

describe("parseInviteJoin", () => {
	it("returns the joined server id", () => {
		expect(
			parseInviteJoin({ type: "Server", server: { _id: "01SERVER" } }),
		).toEqual({ kind: "server", id: "01SERVER" });
	});

	it("returns the joined group id", () => {
		expect(
			parseInviteJoin({ type: "Group", channel: { _id: "01GROUP" } }),
		).toEqual({ kind: "group", id: "01GROUP" });
	});
});

describe("hydrateInviteJoin", () => {
	it("hydrates server channels into the client", () => {
		const getOrCreateChannel = vi.fn();
		const getOrCreateServer = vi.fn();
		hydrateInviteJoin(
			{
				channels: { getOrCreate: getOrCreateChannel },
				servers: { getOrCreate: getOrCreateServer },
			} as never,
			{
				type: "Server",
				server: { _id: "01SERVER", name: "Lounge" },
				channels: [{ _id: "01CHANNEL", name: "general" }],
			},
		);
		expect(getOrCreateChannel).toHaveBeenCalledWith("01CHANNEL", {
			_id: "01CHANNEL",
			name: "general",
		});
		expect(getOrCreateServer).toHaveBeenCalledWith(
			"01SERVER",
			{ _id: "01SERVER", name: "Lounge" },
			true,
		);
	});
});

describe("inviteErrorCopy", () => {
	it("uses Discord invalid-invite copy for 404", () => {
		expect(inviteErrorCopy(404, { type: "NotFound" })).toEqual({
			type: "NotFound",
			heading: "Invite invalid",
			message:
				"This invite may be expired, or you might not have permission to join.",
		});
	});
});

describe("useInvite", () => {
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

	it("shows an error card view for a missing invite", async () => {
		const { result } = renderHook(() => useInvite("demo-invite"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("error");
		});
		expect(result.current.view).toMatchObject({
			status: "error",
			heading: "Invite invalid",
		});
	});

	it("shows a login action when signed out of a live invite", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					type: "Server",
					code: "abc123",
					server_id: "01SERVER",
					server_name: "Lounge",
					channel_id: "01CHANNEL",
					channel_name: "general",
					user_name: "ada",
					member_count: 3,
				}),
			}),
		);
		const { result } = renderHook(() => useInvite("abc123"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("ready");
		});
		expect(result.current.view).toMatchObject({
			status: "ready",
			invite: { name: "Lounge" },
			action: { kind: "login" },
		});
	});

	it("shows join when signed in and not a member", async () => {
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
					type: "Server",
					code: "abc123",
					server_id: "01SERVER",
					server_name: "Lounge",
					channel_id: "01CHANNEL",
					channel_name: "general",
					user_name: "ada",
					member_count: 3,
				}),
			}),
		);
		const { result } = renderHook(() => useInvite("abc123"), { wrapper });
		await waitFor(() => {
			expect(result.current.view.status).toBe("ready");
		});
		expect(result.current.view).toMatchObject({
			action: { kind: "join", pending: false },
		});
	});
});
