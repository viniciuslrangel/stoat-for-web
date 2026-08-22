import { Link } from "@tanstack/react-router";
import {
	HeadphoneOff,
	Headphones,
	Mic,
	MicOff,
	MonitorUp,
	PhoneOff,
	Settings,
	Signal,
	Video,
	VideoOff,
	Volume2,
} from "lucide-react";

import { UserAccountMenu } from "@/components/shell/UserAccountMenu";
import { Button } from "@/components/ui/button";
import type { MeSnapshot } from "@/hooks/shell-snapshots";
import { useVoiceActions, useVoiceSession } from "@/hooks/useVoiceSession";
import { cn } from "@/lib/utils";
import { isVoiceSessionActive } from "@/lib/voice/voice-chrome";

function statusLabel(phase: string): string {
	switch (phase) {
		case "connecting":
			return "Connecting…";
		case "connected":
			return "Voice Connected";
		case "reconnecting":
			return "Reconnecting…";
		default:
			return "Voice";
	}
}

/**
 * Discord-like bottom-left chrome: voice strip (when in call) + user card.
 * Identity opens via UserAccountMenu (Settings / Copy User ID); mute/deafen sit beside it.
 */
export function UserVoiceTray({ me }: { me: MeSnapshot | null }) {
	const session = useVoiceSession();
	const actions = useVoiceActions();
	const inCall =
		Boolean(session.channelId) && isVoiceSessionActive(session.phase);
	const participantCount = session.participants.length;

	return (
		<div
			data-testid="user-voice-tray"
			className="shrink-0 border-t-[3px] border-border sidebar-surface text-foreground"
		>
			{inCall ? (
				<div
					data-testid="voice-connected-strip"
					className="flex items-start justify-between gap-2 border-b-[3px] border-border px-2 py-1.5"
				>
					<div className="min-w-0">
						<p className="flex items-center gap-1.5 text-xs font-semibold text-success">
							<Signal className="size-3.5 shrink-0" aria-hidden />
							<span data-testid="voice-status">
								{statusLabel(session.phase)}
							</span>
						</p>
						<p className="mt-0.5 truncate text-[11px] text-muted-foreground">
							{session.channelName ?? "Voice"}
							{participantCount > 0 ? ` · ${participantCount}` : ""}
						</p>
					</div>
					<Button
						type="button"
						size="icon-sm"
						variant="destructive"
						aria-label="End Call"
						data-testid="voice-end-call"
						onClick={() => void actions.disconnect()}
					>
						<PhoneOff className="size-4" />
					</Button>
				</div>
			) : null}

			{inCall ? (
				<div
					data-testid="voice-media-row"
					className="flex items-center gap-1 border-b-[3px] border-border px-2 py-1.5"
				>
					<Button
						type="button"
						size="icon-sm"
						variant="outline"
						aria-label="Camera (not available yet)"
						title="Camera coming soon"
						data-testid="voice-camera"
						disabled
						aria-pressed={session.cameraEnabled}
					>
						{session.cameraEnabled ? (
							<Video className="size-4" />
						) : (
							<VideoOff className="size-4" />
						)}
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant={session.screenshareEnabled ? "default" : "outline"}
						aria-label={
							session.screenshareEnabled
								? "Stop sharing your screen"
								: "Share your screen"
						}
						data-testid="voice-screenshare"
						aria-pressed={session.screenshareEnabled}
						onClick={() => void actions.toggleScreenshare()}
					>
						<MonitorUp className="size-4" />
					</Button>
				</div>
			) : null}

			{session.error && inCall ? (
				<p className="border-b-[3px] border-border px-2 py-1 text-[11px] text-destructive">
					{session.error}
				</p>
			) : null}

			<div
				data-testid="user-tray-card"
				className="flex items-center gap-1 px-1.5 py-1.5"
			>
				<UserAccountMenu
					me={me}
					subtitle={
						inCall ? (
							<p className="flex items-center gap-1 truncate text-[10px] font-medium text-success">
								<Volume2 className="size-3 shrink-0" aria-hidden />
								In voice
							</p>
						) : me ? (
							<p className="truncate text-[10px] text-muted-foreground">
								{me.username}
							</p>
						) : null
					}
				/>

				{inCall ? (
					<>
						<Button
							type="button"
							size="icon-sm"
							variant={session.microphone ? "ghost" : "destructive"}
							aria-label={session.microphone ? "Mute" : "Unmute"}
							aria-pressed={!session.microphone}
							data-testid="voice-mute"
							disabled={!session.canSpeak}
							onClick={() => void actions.toggleMute()}
						>
							{session.microphone ? (
								<Mic className="size-4" />
							) : (
								<MicOff className="size-4" />
							)}
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant={session.deafen ? "destructive" : "ghost"}
							aria-label={session.deafen ? "Undeafen" : "Deafen"}
							aria-pressed={session.deafen}
							data-testid="voice-deafen"
							onClick={() => void actions.toggleDeafen()}
						>
							{session.deafen ? (
								<HeadphoneOff className="size-4" />
							) : (
								<Headphones className="size-4" />
							)}
						</Button>
					</>
				) : null}

				<Link
					to="/settings"
					aria-label="User settings"
					data-testid="user-tray-settings"
					className={cn(
						"inline-flex size-8 shrink-0 items-center justify-center rounded-md border-[3px] border-transparent text-muted-foreground no-underline",
						"hover:border-border hover:bg-sidebar-accent hover:text-foreground",
					)}
				>
					<Settings className="size-4" />
				</Link>
			</div>
		</div>
	);
}
