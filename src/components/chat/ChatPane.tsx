import { useAtom } from "jotai";
import { ChevronLeft, Hash, Users, Volume2 } from "lucide-react";

import { Composer } from "@/components/chat/Composer";
import { MemberList } from "@/components/chat/MemberList";
import { MessageList } from "@/components/chat/MessageList";
import { PanelResizeHandle } from "@/components/shell/PanelResizeHandle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	VoiceCallPanel,
	VoiceCallSplitLayout,
} from "@/components/voice/VoiceCallPanel";
import { composerPlaceholder, showsMemberList } from "@/hooks/chat-snapshots";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { useChannelSnapshot } from "@/hooks/useChannelSnapshot";
import { useForceVoiceStage } from "@/hooks/useForceVoiceStage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { presentVoiceChrome } from "@/lib/voice/voice-chrome";
import {
	MEMBER_LIST_WIDTH,
	memberListWidthAtom,
	membersCollapsedAtom,
} from "@/state/prefs";

export function ChatPane({
	channelId,
	highlightMessageId,
	screenId,
	loading,
}: {
	channelId: string;
	highlightMessageId?: string;
	screenId: "channel" | "channel-message";
	loading: boolean;
}) {
	const isPhone = useMediaQuery("(max-width: 767px)");
	const channel = useChannelSnapshot(channelId);
	const voice = useVoiceSession();
	const forceVideoStage = useForceVoiceStage();
	const { messages, loading: messagesLoading } = useMessages(channelId);
	const { send, pending } = useSendMessage(channelId);
	const { namesById } = useChannelMembers(channel);
	const [memberListWidth, setMemberListWidth] = useAtom(memberListWidthAtom);
	const [membersCollapsed, setMembersCollapsed] = useAtom(membersCollapsedAtom);
	const title = channel?.name ?? "Channel";
	const isVoice = Boolean(channel?.isVoice);
	const chrome = presentVoiceChrome({
		session: voice,
		viewingVoiceChannel: isVoice ? { id: channelId, name: title } : null,
		forceVideoStage,
	});
	const showCallStage =
		chrome.kind === "prejoin" ||
		(chrome.kind === "in_call" && chrome.showStage);
	const inCallSplit = chrome.kind === "in_call" && chrome.showStage;
	const canShowMembers = Boolean(
		channel && showsMemberList(channel) && !isPhone,
	);
	const membersOpen = canShowMembers && !membersCollapsed;
	const HeaderIcon = isVoice ? Volume2 : Hash;

	const chatColumn = (
		<>
			{isPhone ? null : (
				<header className="flex h-12 shrink-0 items-center gap-2 border-b-[3px] border-border px-4">
					<HeaderIcon className="size-5 text-muted-foreground" />
					{loading ? (
						<Skeleton className="h-4 w-32 rounded-md bg-muted" />
					) : (
						<h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
							{title}
						</h1>
					)}
					{canShowMembers ? (
						<Button
							type="button"
							variant={membersCollapsed ? "outline" : "ghost"}
							size="icon-sm"
							aria-label={
								membersCollapsed ? "Show member list" : "Hide member list"
							}
							aria-pressed={!membersCollapsed}
							data-testid="toggle-member-list"
							onClick={() => setMembersCollapsed(!membersCollapsed)}
						>
							<Users className="size-4" />
						</Button>
					) : null}
				</header>
			)}
			<MessageList
				messages={messages}
				highlightMessageId={highlightMessageId}
				loading={loading || messagesLoading}
				userNames={namesById}
			/>
			<Composer
				placeholder={composerPlaceholder(channel)}
				disabled={loading || pending}
				onSend={send}
			/>
		</>
	);

	const mainColumn =
		isVoice && showCallStage ? (
			<VoiceCallSplitLayout
				inCall={inCallSplit}
				call={<VoiceCallPanel channelId={channelId} channelName={title} />}
				chat={chatColumn}
			/>
		) : (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">{chatColumn}</div>
		);

	return (
		<main
			data-testid={`screen-${screenId}`}
			className="flex min-h-0 min-w-0 flex-1 app-canvas text-foreground"
		>
			{mainColumn}
			{membersOpen && channel ? (
				<div
					className="relative hidden h-full shrink-0 lg:flex lg:flex-col"
					style={{ width: memberListWidth }}
					data-testid="member-list-pane"
				>
					<PanelResizeHandle
						edge="left"
						value={memberListWidth}
						min={MEMBER_LIST_WIDTH.min}
						max={MEMBER_LIST_WIDTH.max}
						onChange={setMemberListWidth}
						aria-label="Resize member list"
						testId="member-list-resize-handle"
					/>
					<MemberList channel={channel} />
				</div>
			) : null}
			{canShowMembers && membersCollapsed ? (
				<button
					type="button"
					data-testid="expand-member-list"
					aria-label="Show member list"
					className="hidden h-full w-5 shrink-0 items-center justify-center border-l-[3px] border-border sidebar-surface text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:flex"
					onClick={() => setMembersCollapsed(false)}
				>
					<ChevronLeft className="size-4" />
				</button>
			) : null}
		</main>
	);
}
