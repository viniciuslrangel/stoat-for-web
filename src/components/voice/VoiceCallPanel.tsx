import { useAtom } from "jotai";
import { HeadphoneOff, MicOff } from "lucide-react";
import { type ReactNode, useRef } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user";
import { VoiceVideoStage } from "@/components/voice/VoiceVideoStage";
import { useVoiceParticipants } from "@/hooks/useVoiceParticipants";
import { useVoiceActions, useVoiceSession } from "@/hooks/useVoiceSession";
import { cn } from "@/lib/utils";
import { CHANNEL_CALL_SPLIT, channelCallSplitAtom } from "@/state/prefs";

function statusLabel(phase: string): string {
	switch (phase) {
		case "connecting":
			return "Connecting…";
		case "connected":
			return "Connected";
		case "reconnecting":
			return "Reconnecting…";
		case "disconnected":
			return "Disconnected";
		default:
			return "Ready";
	}
}

export function VoiceCallPanel({
	channelId,
	channelName,
}: {
	channelId: string;
	channelName: string;
}) {
	const session = useVoiceSession();
	const actions = useVoiceActions();
	const preview = useVoiceParticipants(channelId);
	const inThisChannel =
		session.channelId === channelId && session.phase !== "ready";
	const connectedHere =
		inThisChannel &&
		(session.phase === "connected" || session.phase === "reconnecting");

	const participants = connectedHere
		? session.participants.map((p) => ({
				id: p.identity,
				name: p.name,
				micMuted: p.micMuted,
				deafened: p.deafened,
				speaking: p.speaking,
				isLocal: p.isLocal,
			}))
		: preview.map((p) => ({
				id: p.userId,
				name: p.name,
				micMuted: false,
				deafened: false,
				speaking: false,
				isLocal: false,
			}));

	return (
		<div
			data-testid="voice-call-panel"
			className="flex h-full min-h-0 flex-col bg-sidebar text-foreground"
		>
			<div className="flex items-center justify-between gap-2 border-b-[3px] border-border px-3 py-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-bold tracking-tight">
						{channelName}
					</p>
					<p
						className="text-xs text-muted-foreground"
						data-testid="voice-stage-status"
					>
						{inThisChannel ? statusLabel(session.phase) : "Voice channel"}
					</p>
				</div>
				{connectedHere ? null : (
					<Button
						type="button"
						size="sm"
						data-testid="voice-join"
						disabled={session.phase === "connecting"}
						onClick={() => void actions.connect(channelId)}
					>
						{session.channelId && session.channelId !== channelId
							? "Switch"
							: "Join"}
					</Button>
				)}
			</div>
			{session.error && inThisChannel ? (
				<p className="border-b-[3px] border-border px-3 py-1.5 text-xs text-destructive">
					{session.error}
				</p>
			) : null}
			{connectedHere ? <VoiceVideoStage /> : null}
			<ul
				className="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto p-3"
				data-testid="voice-participants"
			>
				{participants.length === 0 ? (
					<li className="text-xs text-muted-foreground">No one is here yet</li>
				) : (
					participants.map((participant) => (
						<li
							key={participant.id}
							className={cn(
								"flex min-w-[7rem] flex-col items-center gap-1 rounded-md border-[3px] border-border bg-background px-2 py-2",
								participant.speaking && "border-primary",
							)}
							data-testid="voice-participant"
						>
							<div
								className={cn(
									"rounded-full",
									participant.speaking &&
										"ring-2 ring-primary ring-offset-2 ring-offset-background",
								)}
							>
								<UserAvatar
									name={participant.name}
									size="lg"
									surface="background"
									showPresence={false}
									fallbackClassName="bg-muted text-foreground"
								/>
							</div>
							<span className="max-w-full truncate text-xs font-medium">
								{participant.isLocal
									? `${participant.name} (you)`
									: participant.name}
							</span>
							<span className="flex gap-1 text-muted-foreground">
								{participant.micMuted ? <MicOff className="size-3" /> : null}
								{participant.deafened ? (
									<HeadphoneOff className="size-3" />
								) : null}
							</span>
						</li>
					))
				)}
			</ul>
		</div>
	);
}

export function VoiceCallSplitLayout({
	call,
	chat,
	inCall,
}: {
	call: ReactNode;
	chat: ReactNode;
	inCall: boolean;
}) {
	const [ratio, setRatio] = useAtom(channelCallSplitAtom);
	const dragRef = useRef<{
		startY: number;
		startRatio: number;
		height: number;
	} | null>(null);
	const previewPx = 148;

	if (!inCall) {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div
					className="shrink-0 border-b-[3px] border-border"
					style={{ height: previewPx }}
					data-testid="voice-call-preview-pane"
				>
					{call}
				</div>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">{chat}</div>
			</div>
		);
	}

	return (
		<div
			className="flex min-h-0 min-w-0 flex-1 flex-col"
			data-testid="voice-call-split"
		>
			<div
				className="relative min-h-[160px] shrink-0 overflow-hidden border-b-[3px] border-border"
				style={{ flex: `${ratio} 1 0%` }}
				data-testid="voice-call-pane"
			>
				{call}
				{/* biome-ignore lint/a11y/useSemanticElements: horizontal call/chat splitter */}
				<div
					role="separator"
					aria-orientation="horizontal"
					aria-label="Resize voice call"
					aria-valuenow={Math.round(ratio * 100)}
					aria-valuemin={Math.round(CHANNEL_CALL_SPLIT.min * 100)}
					aria-valuemax={Math.round(CHANNEL_CALL_SPLIT.max * 100)}
					data-testid="voice-call-resize-handle"
					tabIndex={0}
					className="absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-row-resize touch-none hover:bg-primary/35 focus-visible:bg-primary/50 focus-visible:outline-none active:bg-primary/50"
					onPointerDown={(event) => {
						if (event.button !== 0) {
							return;
						}
						event.preventDefault();
						event.currentTarget.setPointerCapture(event.pointerId);
						const parent = event.currentTarget.parentElement?.parentElement;
						dragRef.current = {
							startY: event.clientY,
							startRatio: ratio,
							height: parent?.clientHeight ?? 600,
						};
					}}
					onPointerMove={(event) => {
						const drag = dragRef.current;
						if (
							!drag ||
							!event.currentTarget.hasPointerCapture(event.pointerId)
						) {
							return;
						}
						const delta = (event.clientY - drag.startY) / drag.height;
						setRatio(drag.startRatio + delta);
					}}
					onPointerUp={(event) => {
						if (event.currentTarget.hasPointerCapture(event.pointerId)) {
							event.currentTarget.releasePointerCapture(event.pointerId);
						}
						dragRef.current = null;
					}}
					onPointerCancel={() => {
						dragRef.current = null;
					}}
					onKeyDown={(event) => {
						const step = event.shiftKey ? 0.05 : 0.02;
						if (event.key === "ArrowUp") {
							event.preventDefault();
							setRatio(ratio - step);
						} else if (event.key === "ArrowDown") {
							event.preventDefault();
							setRatio(ratio + step);
						} else if (event.key === "Home") {
							event.preventDefault();
							setRatio(CHANNEL_CALL_SPLIT.min);
						} else if (event.key === "End") {
							event.preventDefault();
							setRatio(CHANNEL_CALL_SPLIT.max);
						}
					}}
				/>
			</div>
			<div
				className="flex min-h-[220px] min-w-0 flex-col"
				style={{ flex: `${1 - ratio} 1 0%` }}
			>
				{chat}
			</div>
		</div>
	);
}
