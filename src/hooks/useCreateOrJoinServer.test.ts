import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { parseServerId } from "@/domain/ids";
import { InviteRequestError, joinInvite } from "@/hooks/useInvite";
import { getStoatClient } from "@/lib/stoat-client";

import {
	createServerNamed,
	joinServerFromInput,
	messageForCreateServerFailure,
	messageForJoinServerFailure,
} from "./useCreateOrJoinServer";

vi.mock("@/hooks/useInvite", async () => {
	const actual =
		await vi.importActual<typeof import("@/hooks/useInvite")>(
			"@/hooks/useInvite",
		);
	return {
		...actual,
		joinInvite: vi.fn(),
	};
});

vi.mock("@/lib/stoat-client", () => ({
	getStoatClient: vi.fn(),
}));

describe("joinServerFromInput", () => {
	beforeEach(() => {
		vi.mocked(joinInvite).mockReset();
	});

	it("rejects empty input", async () => {
		await expect(joinServerFromInput("  ")).rejects.toThrow(
			"Enter an invite code or link.",
		);
	});

	it("joins with a code extracted from a link", async () => {
		vi.mocked(joinInvite).mockResolvedValue({
			kind: "server",
			id: parseServerId("01SERVER"),
		});
		await expect(joinServerFromInput("https://stt.gg/abc123")).resolves.toEqual(
			{
				kind: "server",
				id: parseServerId("01SERVER"),
			},
		);
		expect(joinInvite).toHaveBeenCalledWith("abc123");
	});
});

describe("createServerNamed", () => {
	beforeEach(() => {
		vi.mocked(getStoatClient).mockReset();
	});

	it("rejects empty names", async () => {
		await expect(createServerNamed("  ")).rejects.toThrow(
			"Enter a server name.",
		);
	});

	it("creates via the stoat client", async () => {
		const createServer = vi.fn().mockResolvedValue({ id: "01NEWSERVER" });
		vi.mocked(getStoatClient).mockReturnValue({
			servers: { createServer },
		} as never);
		await expect(createServerNamed(" Lounge ")).resolves.toBe(
			parseServerId("01NEWSERVER"),
		);
		expect(createServer).toHaveBeenCalledWith({ name: "Lounge" });
	});
});

describe("failure copy", () => {
	it("surfaces invite request errors", () => {
		expect(
			messageForJoinServerFailure(
				new InviteRequestError(404, { type: "NotFound" }),
			),
		).toMatch(/expired/i);
	});

	it("surfaces create validation errors", () => {
		expect(
			messageForCreateServerFailure(new Error("Enter a server name.")),
		).toBe("Enter a server name.");
	});
});
