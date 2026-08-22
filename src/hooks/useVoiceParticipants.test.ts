import { describe, expect, it } from "vite-plus/test";

import { mergeVoiceParticipantProfile } from "@/hooks/useVoiceParticipants";

describe("mergeVoiceParticipantProfile", () => {
	it("uses the shared member snapshot for name, avatar, and presence", () => {
		const participant = {
			userId: "01ALICE",
			name: "01ALICE",
			avatarUrl: null,
			presence: null,
		};

		expect(
			mergeVoiceParticipantProfile(participant, {
				displayName: "Alice",
				avatarUrl: "https://cdn.test/alice",
				presence: "Online",
			}),
		).toEqual({
			userId: "01ALICE",
			name: "Alice",
			avatarUrl: "https://cdn.test/alice",
			presence: "Online",
		});
	});

	it("preserves the boundary snapshot when member data is unavailable", () => {
		const participant = {
			userId: "01BOB",
			name: "Bob",
			avatarUrl: null,
			presence: null,
		};

		expect(mergeVoiceParticipantProfile(participant, undefined)).toEqual(
			participant,
		);
	});
});
