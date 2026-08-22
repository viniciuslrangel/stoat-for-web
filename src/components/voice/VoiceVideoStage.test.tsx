import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { VoiceVideoSurface } from "@/components/voice/VoiceVideoStage";
import type { VoiceVideoSurfaceDescriptor } from "@/lib/voice/voice-video-types";

const remoteSurface: VoiceVideoSurfaceDescriptor = {
	id: "participant-1:screenshare",
	participantSid: "participant-1",
	participantIdentity: "alice",
	participantName: "Alice",
	source: "screenshare",
	local: false,
	isLive: false,
	isWatching: false,
	mediaGeneration: 0,
};

describe("VoiceVideoSurface", () => {
	it("shows resume watching for a paused remote share", async () => {
		const user = userEvent.setup();
		render(<VoiceVideoSurface surface={remoteSurface} />);

		expect(screen.getByTestId("voice-video-placeholder")).toBeVisible();
		expect(screen.getByText("Alice is sharing")).toBeVisible();
		expect(screen.getByTestId("voice-resume-watching")).toBeVisible();
		await user.click(screen.getByTestId("voice-resume-watching"));
	});

	it("shows stop watching for a live remote share", () => {
		render(
			<VoiceVideoSurface
				surface={{ ...remoteSurface, isLive: true, isWatching: true }}
			/>,
		);

		expect(screen.getByTestId("voice-video-surface")).toBeVisible();
		expect(screen.getByTestId("voice-stop-watching")).toBeVisible();
	});
});
