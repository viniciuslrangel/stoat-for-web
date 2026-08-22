import { describe, expect, it } from "vite-plus/test";
import { channelIsVoice } from "@/hooks/chat-snapshots";
import {
	canPublishDeafenAttribute,
	deafenAttributePayload,
	isOwnMetadataPermissionError,
	LIVEKIT_DEAFEN_ATTRIBUTE,
	participantIsDeafened,
} from "@/lib/voice/deafen-attribute";
import {
	livekitHttpProbeUrl,
	pickLivekitNode,
} from "@/lib/voice/pick-livekit-node";

describe("deafen-attribute", () => {
	it("encodes deafen as LiveKit participant attribute", () => {
		expect(deafenAttributePayload(true)).toEqual({
			[LIVEKIT_DEAFEN_ATTRIBUTE]: "true",
		});
		expect(deafenAttributePayload(false)).toEqual({
			[LIVEKIT_DEAFEN_ATTRIBUTE]: "",
		});
	});

	it("reads deafen from participant attributes", () => {
		expect(
			participantIsDeafened({
				attributes: { [LIVEKIT_DEAFEN_ATTRIBUTE]: "true" },
			} as never),
		).toBe(true);
		expect(participantIsDeafened({ attributes: {} } as never)).toBe(false);
	});

	it("requires canUpdateMetadata to publish", () => {
		expect(
			canPublishDeafenAttribute({
				permissions: { canUpdateMetadata: true },
			} as never),
		).toBe(true);
		expect(
			canPublishDeafenAttribute({
				permissions: { canUpdateMetadata: false },
			} as never),
		).toBe(false);
	});

	it("detects own-metadata permission errors", () => {
		expect(
			isOwnMetadataPermissionError(
				new Error("cannot update own metadata without grant"),
			),
		).toBe(true);
		expect(isOwnMetadataPermissionError(new Error("boom"))).toBe(false);
	});
});

describe("pickLivekitNode", () => {
	it("converts wss probe urls to https", () => {
		expect(livekitHttpProbeUrl("wss://example.test/livekit")).toBe(
			"https://example.test/livekit",
		);
	});

	it("returns the first healthy node name", async () => {
		const name = await pickLivekitNode(
			[
				{ name: "slow", public_url: "wss://slow.test" },
				{ name: "fast", public_url: "wss://fast.test" },
			],
			async (url) => {
				if (String(url).includes("fast")) {
					return new Response(null, { status: 200 });
				}
				await new Promise((resolve) => setTimeout(resolve, 50));
				return new Response(null, { status: 200 });
			},
		);
		expect(name).toBe("fast");
	});

	it("throws when no nodes are configured", async () => {
		await expect(pickLivekitNode([])).rejects.toThrow(/No LiveKit nodes/);
	});
});

describe("channelIsVoice", () => {
	it("treats DM, Group, VoiceChannel, and voice object as voice", () => {
		expect(channelIsVoice({ type: "DirectMessage" })).toBe(true);
		expect(channelIsVoice({ type: "Group" })).toBe(true);
		expect(channelIsVoice({ type: "VoiceChannel" })).toBe(true);
		expect(channelIsVoice({ type: "TextChannel", voice: {} })).toBe(true);
		expect(channelIsVoice({ type: "TextChannel" })).toBe(false);
		expect(channelIsVoice({ type: "TextChannel", isVoice: true })).toBe(true);
	});
});
