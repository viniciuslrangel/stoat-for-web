import { Link, useRouterState } from "@tanstack/react-router";
import { House, NotebookPen, Users } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar, UserAvatar } from "@/components/user";
import type { ChannelId } from "@/domain/ids";
import type { ConversationSnapshot } from "@/hooks/shell-snapshots";
import { cn } from "@/lib/utils";

function navClass(active: boolean): string {
	return cn(
		"flex h-10 items-center gap-3 rounded-md border-[3px] px-2 text-sm font-semibold no-underline",
		active
			? "border-border active-surface text-foreground"
			: "border-transparent text-muted-foreground hover:border-border hover:bg-sidebar-accent hover:text-foreground",
	);
}

export function HomeSidebar({
	conversations,
	savedNotesId,
	loading,
}: {
	conversations: readonly ConversationSnapshot[];
	savedNotesId: ChannelId | null;
	loading: boolean;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const homeActive = pathname === "/app" || pathname.startsWith("/app/");
	const friendsActive =
		pathname === "/friends" || pathname.startsWith("/friends/");

	return (
		<aside
			data-testid="home-sidebar"
			aria-label="Home"
			className="flex min-h-0 min-w-0 flex-1 flex-col border-r-[3px] border-border sidebar-surface"
		>
			<div className="flex h-12 items-center border-b-[3px] border-border px-3 text-base font-bold tracking-tight text-foreground">
				Conversations
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-1 p-2">
					<Link to="/app" className={navClass(homeActive)}>
						<House className="size-5 shrink-0" />
						Home
					</Link>
					<Link to="/friends" className={navClass(friendsActive)}>
						<Users className="size-5 shrink-0" />
						Friends
					</Link>
					{savedNotesId ? (
						<Link
							to="/channel/$channelId"
							params={{ channelId: savedNotesId }}
							className={navClass(pathname.includes(savedNotesId))}
						>
							<NotebookPen className="size-5 shrink-0" />
							Saved Notes
						</Link>
					) : null}
					<div className="mt-3 mb-1 px-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
						Direct messages
					</div>
					{loading
						? [0, 1, 2, 3].map((key) => (
								<Skeleton
									key={key}
									className="h-10 rounded-md border-[3px] border-border bg-sidebar-accent"
								/>
							))
						: conversations.map((conversation) => {
								const active = pathname.includes(conversation.id);
								return (
									<Link
										key={conversation.id}
										to="/channel/$channelId"
										params={{ channelId: conversation.id }}
										className={cn(
											"flex h-11 items-center gap-2 rounded-md border-[3px] px-2 no-underline",
											active
												? "border-border active-surface text-foreground"
												: "border-transparent text-foreground/90 hover:border-border hover:bg-sidebar-accent",
										)}
									>
										{conversation.kind === "direct" ? (
											<UserAvatar
												name={conversation.name}
												src={conversation.iconUrl}
												presence={conversation.presence ?? "Invisible"}
												size="sm"
												surface="sidebar"
											/>
										) : (
											<EntityAvatar
												name={conversation.name}
												src={conversation.iconUrl}
												size="sm"
												fallbackClassName="bg-primary text-primary-foreground"
											/>
										)}
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-semibold">
												{conversation.name}
											</div>
											{conversation.kind === "group" &&
											conversation.memberCount !== null ? (
												<div className="truncate text-xs text-muted-foreground">
													{conversation.memberCount}{" "}
													{conversation.memberCount === 1
														? "Member"
														: "Members"}
												</div>
											) : null}
										</div>
									</Link>
								);
							})}
				</div>
			</ScrollArea>
		</aside>
	);
}
