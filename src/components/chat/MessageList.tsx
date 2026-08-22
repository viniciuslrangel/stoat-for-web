"use no memo";

import { useState } from "react";

import { MessageContent } from "@/components/chat/MessageContent";
import { UserAvatar } from "@/components/user";
import type { MessageSnapshot } from "@/hooks/chat-snapshots";
import {
	useMessageVirtualizer,
	useScrollToHighlightedMessage,
	useStickToLatestMessage,
} from "@/hooks/useMessageVirtualizer";
import { collapseCallSystemMessages } from "@/lib/collapse-call-system-messages";
import {
	displayedAuthorName,
	isUnresolvedDisplayName,
} from "@/lib/display-name";
import {
	mergeUserNameLookups,
	type UserNameLookup,
	usersByIdFromMessages,
} from "@/lib/mentions";
import {
	formatSystemMessageSegments,
	type SystemMessageSegment,
	shortUserLabel,
} from "@/lib/system-message";
import { cn } from "@/lib/utils";

function formatTime(createdAt: number): string {
	if (createdAt <= 0) {
		return "";
	}
	return new Date(createdAt).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

function isGroupedWithPrevious(
	messages: readonly MessageSnapshot[],
	index: number,
): boolean {
	const current = messages[index];
	const previous = messages[index - 1];
	if (!current || !previous || !current.authorId || !previous.authorId) {
		return false;
	}
	if (current.system || previous.system) {
		return false;
	}
	if (current.authorId !== previous.authorId) {
		return false;
	}
	return current.createdAt - previous.createdAt < 7 * 60 * 1000;
}

function resolveSystemName(
	message: MessageSnapshot,
	userId: string,
	usersById?: UserNameLookup,
): string {
	const fromSnapshot = message.systemNames[userId];
	if (fromSnapshot && !isUnresolvedDisplayName(fromSnapshot, userId)) {
		return fromSnapshot;
	}
	return (
		usersById?.get(userId) ??
		usersById?.get(userId.toUpperCase()) ??
		fromSnapshot ??
		shortUserLabel(userId)
	);
}

function SystemMessageBody({
	message,
	usersById,
}: {
	message: MessageSnapshot;
	usersById?: UserNameLookup;
}) {
	if (!message.system) {
		return null;
	}
	const segments = formatSystemMessageSegments(message.system, (userId) =>
		resolveSystemName(message, userId, usersById),
	);
	const time = formatTime(message.createdAt);
	return (
		<div
			data-testid="system-message-body"
			className="text-sm text-muted-foreground"
		>
			{segments.map((segment) => (
				<SystemSegment
					key={`${segment.kind}:${segment.value}`}
					segment={segment}
				/>
			))}
			{time ? (
				<span className="ml-2 text-xs text-muted-foreground/80"> {time}</span>
			) : null}
		</div>
	);
}

function SystemSegment({ segment }: { segment: SystemMessageSegment }) {
	if (segment.kind === "emphasis") {
		return (
			<span className="font-semibold text-foreground/80">{segment.value}</span>
		);
	}
	return <span>{segment.value}</span>;
}

export function MessageList({
	messages,
	highlightMessageId,
	loading,
	userNames,
}: {
	messages: readonly MessageSnapshot[];
	highlightMessageId?: string;
	loading: boolean;
	/** Channel/server member names (shared with MemberList). */
	userNames?: UserNameLookup;
}) {
	const visibleMessages = collapseCallSystemMessages(messages);
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null,
	);
	const virtualizer = useMessageVirtualizer(
		scrollElement,
		visibleMessages.length,
		(index) => visibleMessages[index]?.id ?? index,
	);
	useStickToLatestMessage(virtualizer, visibleMessages.length);
	useScrollToHighlightedMessage(
		virtualizer,
		visibleMessages,
		highlightMessageId,
	);

	if (loading) {
		return (
			<div
				data-testid="message-list"
				className="flex min-h-0 flex-1 flex-col justify-end gap-3 px-4 py-4"
			>
				<div className="h-12 max-w-md animate-pulse rounded-md border-[3px] border-border bg-muted" />
				<div className="h-12 max-w-sm animate-pulse rounded-md border-[3px] border-border bg-muted" />
				<div className="h-12 max-w-lg animate-pulse rounded-md border-[3px] border-border bg-muted" />
			</div>
		);
	}

	const virtualItems = virtualizer.getVirtualItems();
	const usersById = mergeUserNameLookups(
		userNames,
		usersByIdFromMessages(visibleMessages),
	);

	return (
		<div
			ref={setScrollElement}
			data-testid="message-list"
			className="min-h-0 flex-1 overflow-y-auto px-4 py-2"
		>
			{visibleMessages.length === 0 ? (
				<div className="flex h-full items-end pb-4 text-sm text-muted-foreground">
					No messages yet. Say hello.
				</div>
			) : (
				<div
					className="relative w-full"
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualItems.map((item) => {
						const message = visibleMessages[item.index];
						if (!message) {
							return null;
						}
						const highlighted = message.id === highlightMessageId;
						if (message.system) {
							return (
								<div
									key={item.key}
									data-index={item.index}
									data-testid={`message-row-${message.id}`}
									data-system={message.system.type}
									ref={virtualizer.measureElement}
									className={cn(
										"absolute top-0 left-0 w-full py-1",
										highlighted &&
											"rounded-md border-[3px] border-primary/40 bg-primary/10",
									)}
									style={{ transform: `translateY(${item.start}px)` }}
								>
									<div className="flex gap-3 px-2">
										<div
											className="flex w-10 shrink-0 items-start justify-center pt-0.5"
											aria-hidden
										>
											<span className="text-sm text-muted-foreground">✦</span>
										</div>
										<div className="min-w-0 flex-1">
											<SystemMessageBody
												message={message}
												usersById={usersById}
											/>
										</div>
									</div>
								</div>
							);
						}
						const grouped = isGroupedWithPrevious(visibleMessages, item.index);
						const authorName = displayedAuthorName(message, usersById);
						return (
							<div
								key={item.key}
								data-index={item.index}
								data-testid={`message-row-${message.id}`}
								ref={virtualizer.measureElement}
								className={cn(
									"absolute top-0 left-0 w-full",
									grouped ? "py-0.5" : "py-1.5",
									highlighted &&
										"rounded-md border-[3px] border-primary/40 bg-primary/10",
								)}
								style={{ transform: `translateY(${item.start}px)` }}
							>
								<div className="flex gap-3 px-2">
									{grouped ? (
										<div
											className="w-10 shrink-0"
											aria-hidden
											data-testid="message-avatar-spacer"
										/>
									) : (
										<div data-testid="message-author-avatar">
											<UserAvatar
												name={authorName}
												src={message.authorAvatarUrl}
												presence={message.authorPresence}
												size="lg"
												surface="background"
												className="mt-0.5"
											/>
										</div>
									)}
									<div className="min-w-0 flex-1">
										{grouped ? null : (
											<div className="flex items-baseline gap-2">
												<span className="truncate text-sm font-bold tracking-tight text-foreground">
													{authorName}
												</span>
												<span className="text-xs text-muted-foreground">
													{formatTime(message.createdAt)}
												</span>
											</div>
										)}
										<MessageContent
											content={message.content}
											attachments={message.attachments}
											usersById={usersById}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
