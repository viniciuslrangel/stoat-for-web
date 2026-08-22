import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { ServerChannelRow } from "@/components/shell/ServerSidebar";
import { parseChannelId } from "@/domain/ids";
import type { ServerChannelSnapshot } from "@/hooks/chat-snapshots";
import { IDLE_VOICE_SESSION } from "@/lib/voice/types";

const connect = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		onDoubleClick,
		title,
		className,
		...rest
	}: {
		children: React.ReactNode;
		onDoubleClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
		title?: string;
		className?: string;
		"data-testid"?: string;
		"aria-label"?: string;
		"data-voice"?: string;
		to?: string;
		params?: unknown;
	}) => (
		<a
			href="/channel/01VOICE"
			className={className}
			title={title}
			onDoubleClick={onDoubleClick}
			data-testid={rest["data-testid"]}
			aria-label={rest["aria-label"]}
			data-voice={rest["data-voice"]}
		>
			{children}
		</a>
	),
	useRouterState: () => "/",
}));

vi.mock("@/hooks/useVoiceSession", () => ({
	useVoiceSession: () => IDLE_VOICE_SESSION,
	useVoiceActions: () => ({
		connect,
		disconnect: vi.fn(),
		toggleMute: vi.fn(),
		toggleDeafen: vi.fn(),
		toggleScreenshare: vi.fn(),
		resumeWatching: vi.fn(),
		stopWatching: vi.fn(),
	}),
}));

vi.mock("@/hooks/useVoiceParticipants", () => ({
	useVoiceParticipants: () => [],
}));

function voiceChannel(
	overrides: Partial<ServerChannelSnapshot> = {},
): ServerChannelSnapshot {
	return {
		id: parseChannelId("01VOICE"),
		name: "General",
		type: "VoiceChannel",
		isVoice: true,
		...overrides,
	};
}

describe("ServerChannelRow", () => {
	it("joins voice on double-click", () => {
		connect.mockClear();
		render(<ServerChannelRow channel={voiceChannel()} active={false} />);

		fireEvent.doubleClick(screen.getByTestId("channel-row-01VOICE"));
		expect(connect).toHaveBeenCalledWith("01VOICE");
	});

	it("does not join text channels on double-click", () => {
		connect.mockClear();
		render(
			<ServerChannelRow
				channel={voiceChannel({
					id: parseChannelId("01TEXT"),
					name: "chat",
					type: "TextChannel",
					isVoice: false,
				})}
				active={false}
			/>,
		);

		fireEvent.doubleClick(screen.getByTestId("channel-row-01TEXT"));
		expect(connect).not.toHaveBeenCalled();
	});
});
