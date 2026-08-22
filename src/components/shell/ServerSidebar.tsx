import { Link, useRouterState } from "@tanstack/react-router";
import {
	AudioWaveform,
	Hash,
	HeadphoneOff,
	MicOff,
	Volume2,
} from "lucide-react";
import type { MouseEvent } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user";
import type {
	ServerChannelSnapshot,
	ServerChannelsSnapshot,
} from "@/hooks/chat-snapshots";
import { useVoiceParticipants } from "@/hooks/useVoiceParticipants";
import { useVoiceActions, useVoiceSession } from "@/hooks/useVoiceSession";
import { displayNameForUser } from "@/lib/display-name";
import { cn } from "@/lib/utils";

function channelIcon(isVoice: boolean) {
	return isVoice ? Volume2 : Hash;
}

type VoiceParticipantRowData = {
	id: string;
	name: string;
	avatarUrl: string | null;
	presence: "Online" | "Idle" | "Focus" | "Busy" | "Invisible" | null;
	micMuted: boolean;
	deafened: boolean;
	speaking: boolean;
};

function VoiceParticipantRow({
	participant,
}: {
	participant: VoiceParticipantRowData;
}) {
	return (
		<li
			data-testid={`voice-participant-row-${participant.id}`}
			className={cn(
				"flex h-8 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs",
				"hover:bg-sidebar-accent",
				participant.micMuted && "text-muted-foreground",
			)}
		>
			<div
				className={cn(
					"shrink-0 rounded-full",
					participant.speaking &&
						"shadow-[0_0_8px_#8fad9a] ring-2 ring-[#8fad9a] ring-offset-1 ring-offset-sidebar",
				)}
			>
				<UserAvatar
					name={participant.name}
					src={participant.avatarUrl}
					presence={participant.presence}
					size="sm"
					surface="sidebar"
					title={participant.name}
				/>
			</div>
			<span className="min-w-0 flex-1 truncate font-medium">
				{participant.name}
			</span>
			{participant.speaking ? (
				<AudioWaveform
					className="size-3.5 shrink-0 text-[#8fad9a]"
					aria-label="Speaking"
					data-testid={`voice-speaking-${participant.id}`}
				/>
			) : participant.micMuted ? (
				<MicOff
					className="size-3 shrink-0 text-muted-foreground"
					aria-label="Muted"
				/>
			) : participant.deafened ? (
				<HeadphoneOff
					className="size-3 shrink-0 text-muted-foreground"
					aria-label="Deafened"
				/>
			) : null}
		</li>
	);
}

function VoicePreview({ channelId }: { channelId: string }) {
	const participants = useVoiceParticipants(channelId);
	const session = useVoiceSession();
	const connectedHere =
		session.channelId === channelId &&
		(session.phase === "connected" || session.phase === "reconnecting");
	if (participants.length === 0) {
		if (!connectedHere || session.participants.length === 0) {
			return null;
		}
	}
	const profileById = new Map(
		participants.map((participant) => [participant.userId, participant]),
	);
	const rows: VoiceParticipantRowData[] = connectedHere
		? session.participants.map((participant) => {
				const profile = profileById.get(participant.identity);
				return {
					id: participant.identity,
					name:
						profile?.name ??
						displayNameForUser({
							displayName: participant.name,
							userId: participant.identity,
						}),
					avatarUrl: profile?.avatarUrl ?? null,
					presence: profile?.presence ?? null,
					micMuted: participant.micMuted,
					deafened: participant.deafened,
					speaking: participant.speaking,
				};
			})
		: participants.map((participant) => ({
				id: participant.userId,
				name: participant.name,
				avatarUrl: participant.avatarUrl,
				presence: participant.presence,
				micMuted: false,
				deafened: false,
				speaking: false,
			}));
	return (
		<ul
			className="mb-1 ml-5 flex flex-col gap-0.5 border-l-2 border-border/60 pl-2"
			data-testid={`voice-preview-${channelId}`}
		>
			{rows.map((participant) => (
				<VoiceParticipantRow key={participant.id} participant={participant} />
			))}
		</ul>
	);
}

export function ServerChannelRow({
	channel,
	active,
}: {
	channel: ServerChannelSnapshot;
	active: boolean;
}) {
	const actions = useVoiceActions();
	const session = useVoiceSession();
	const Icon = channelIcon(channel.isVoice);
	const alreadyInCall =
		channel.isVoice &&
		session.channelId === channel.id &&
		(session.phase === "connecting" ||
			session.phase === "connected" ||
			session.phase === "reconnecting");

	function handleDoubleClick(event: MouseEvent<HTMLAnchorElement>) {
		if (!channel.isVoice || alreadyInCall) {
			return;
		}
		event.preventDefault();
		void actions.connect(channel.id);
	}

	return (
		<div>
			<Link
				to="/channel/$channelId"
				params={{ channelId: channel.id }}
				title={
					channel.isVoice
						? `${channel.name} (double-click to join voice)`
						: channel.name
				}
				aria-label={
					channel.isVoice
						? `${channel.name}, double-click to join voice`
						: channel.name
				}
				data-testid={`channel-row-${channel.id}`}
				data-voice={channel.isVoice ? "true" : undefined}
				onDoubleClick={handleDoubleClick}
				className={cn(
					"flex h-9 items-center gap-2 rounded-md border-[3px] px-2 text-sm font-medium no-underline",
					active
						? "border-border active-surface text-foreground"
						: "border-transparent text-muted-foreground hover:border-border hover:bg-sidebar-accent hover:text-foreground",
				)}
			>
				<Icon className="size-4 shrink-0 text-muted-foreground" />
				<span className="truncate">{channel.name}</span>
			</Link>
			{channel.isVoice ? <VoicePreview channelId={channel.id} /> : null}
		</div>
	);
}

export function ServerSidebar({
	snapshot,
	loading,
}: {
	snapshot: ServerChannelsSnapshot | null;
	loading: boolean;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const name = snapshot?.name ?? "Server";
	const channels = snapshot?.channels ?? [];

	return (
		<aside
			data-testid="server-sidebar"
			aria-label={name}
			className="flex min-h-0 min-w-0 flex-1 flex-col border-r-[3px] border-border sidebar-surface"
		>
			<div className="flex h-12 items-center border-b-[3px] border-border px-3 text-base font-bold tracking-tight text-foreground">
				<span className="truncate">{loading ? "" : name}</span>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-1 p-2">
					{loading
						? [0, 1, 2, 3, 4].map((key) => (
								<Skeleton
									key={key}
									className="h-8 rounded-md border-[3px] border-border bg-sidebar-accent"
								/>
							))
						: channels.map((channel) => (
								<ServerChannelRow
									key={channel.id}
									channel={channel}
									active={pathname.includes(channel.id)}
								/>
							))}
				</div>
			</ScrollArea>
		</aside>
	);
}
