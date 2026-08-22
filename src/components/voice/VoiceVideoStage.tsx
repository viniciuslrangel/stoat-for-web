import { useAtomValue } from "jotai";
import { MonitorUp, Play, Square, Volume2, VolumeX } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { useVoiceActions } from "@/hooks/useVoiceSession";
import { useVoiceVideo } from "@/hooks/useVoiceVideo";
import {
	getScreenShareMuted,
	getScreenShareVolume,
} from "@/lib/voice/screen-share-listener";
import { voiceRuntime } from "@/lib/voice/voice-runtime";
import type { VoiceVideoSurfaceDescriptor } from "@/lib/voice/voice-video-types";
import { screenShareListenerPrefsAtom } from "@/state/prefs";

function sourceLabel(source: VoiceVideoSurfaceDescriptor["source"]): string {
	return source === "screenshare" ? "Screen share" : "Camera";
}

function ScreenShareAudioControls({ identity }: { identity: string }) {
	const actions = useVoiceActions();
	const prefs = useAtomValue(screenShareListenerPrefsAtom);
	const muted = getScreenShareMuted(prefs, identity);
	const volume = getScreenShareVolume(prefs, identity);

	return (
		<div
			className="flex min-w-0 flex-1 items-center gap-2"
			data-testid="voice-screen-share-audio"
		>
			<Button
				type="button"
				size="xs"
				variant="secondary"
				data-testid="voice-screen-share-mute"
				aria-pressed={muted}
				aria-label={muted ? "Unmute screen share" : "Mute screen share"}
				onClick={() => actions.setScreenShareMuted(identity, !muted)}
			>
				{muted ? (
					<VolumeX className="size-3" />
				) : (
					<Volume2 className="size-3" />
				)}
				{muted ? "Unmute" : "Mute"}
			</Button>
			<label className="flex min-w-0 flex-1 items-center gap-1 text-[10px] text-white">
				<span className="sr-only">Screen share volume</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={volume}
					disabled={muted}
					data-testid="voice-screen-share-volume"
					aria-label="Screen share volume"
					className="min-w-0 flex-1 accent-primary"
					onChange={(event) => {
						actions.setScreenShareVolume(
							identity,
							Number(event.currentTarget.value),
						);
					}}
				/>
				<span className="w-8 shrink-0 text-right tabular-nums">
					{Math.round(volume * 100)}%
				</span>
			</label>
		</div>
	);
}

export function VoiceVideoSurface({
	surface,
}: {
	surface: VoiceVideoSurfaceDescriptor;
}) {
	const actions = useVoiceActions();
	const attachVideo = useCallback(
		(element: HTMLVideoElement | null) => {
			voiceRuntime.attachVideoSurface(surface.id, element);
		},
		[surface.id],
	);

	if (!surface.isLive) {
		return (
			<div
				className="flex min-h-36 min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border-[3px] border-border bg-background px-3 py-4 text-center"
				data-testid="voice-video-placeholder"
				data-surface-id={surface.id}
			>
				<MonitorUp className="size-7 text-muted-foreground" aria-hidden />
				<p className="text-sm font-semibold">
					{surface.participantName} is sharing
				</p>
				<p className="text-xs text-muted-foreground">
					{surface.isWatching
						? "Waiting for the share to reconnect."
						: `${sourceLabel(surface.source)} is paused until you resume it.`}
				</p>
				{surface.isWatching ? (
					<Button
						type="button"
						size="sm"
						variant="secondary"
						data-testid="voice-stop-watching"
						onClick={() => actions.stopWatching(surface.participantSid)}
					>
						<Square className="size-3.5" />
						Stop watching
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						data-testid="voice-resume-watching"
						onClick={() => actions.resumeWatching(surface.participantSid)}
					>
						<Play className="size-3.5" />
						Resume watching
					</Button>
				)}
			</div>
		);
	}

	return (
		<div
			className="relative min-h-36 min-w-0 flex-1 overflow-hidden rounded-lg border-[3px] border-border bg-black"
			data-testid="voice-video-surface"
			data-surface-id={surface.id}
			data-media-generation={surface.mediaGeneration}
		>
			<video
				ref={attachVideo}
				autoPlay
				muted={surface.local}
				playsInline
				className="size-full object-contain"
				aria-label={`${surface.participantName} ${sourceLabel(surface.source)}`}
			/>
			<div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
				{!surface.local && surface.source === "screenshare" ? (
					<div className="rounded-md bg-black/70 px-2 py-1.5">
						<ScreenShareAudioControls identity={surface.participantIdentity} />
					</div>
				) : null}
				<div className="flex items-center justify-between gap-2">
					<span className="rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
						{surface.participantName}
						{surface.local ? " (you)" : ""}
					</span>
					{!surface.local && surface.isWatching ? (
						<Button
							type="button"
							size="xs"
							variant="secondary"
							data-testid="voice-stop-watching"
							onClick={() => actions.stopWatching(surface.participantSid)}
						>
							<Square className="size-3" />
							Stop watching
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}

export function VoiceVideoStage() {
	const { surfaces } = useVoiceVideo();
	if (surfaces.length === 0) {
		return null;
	}
	return (
		<section
			className="grid shrink-0 auto-rows-fr grid-cols-1 gap-2 overflow-y-auto border-b-[3px] border-border bg-sidebar-accent/30 p-2 sm:grid-cols-2"
			data-testid="voice-video-stage"
			aria-label="Video call stage"
		>
			{surfaces.map((surface) => (
				<VoiceVideoSurface key={surface.id} surface={surface} />
			))}
		</section>
	);
}
