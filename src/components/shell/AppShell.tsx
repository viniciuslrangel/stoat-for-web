import { useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { HomeSidebar } from "@/components/shell/HomeSidebar";
import { PanelResizeHandle } from "@/components/shell/PanelResizeHandle";
import { ServerRail } from "@/components/shell/ServerRail";
import { ServerSidebar } from "@/components/shell/ServerSidebar";
import { UserVoiceTray } from "@/components/shell/UserVoiceTray";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useChannelSnapshot } from "@/hooks/useChannelSnapshot";
import {
	useDirectMessageList,
	useSavedNotesChannelId,
} from "@/hooks/useDirectMessageList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMeSnapshot } from "@/hooks/useMeSnapshot";
import { useServerChannels } from "@/hooks/useServerChannels";
import { useServerList } from "@/hooks/useServerList";
import { useShellLiveSync } from "@/hooks/useShellLiveSync";
import { useInvalidateShellQueries } from "@/hooks/useSignedInGate";
import { CHANNEL_LIST_WIDTH, channelListWidthAtom } from "@/state/prefs";

function routeIds(pathname: string): {
	serverId: string | undefined;
	channelId: string | undefined;
} {
	const server = /^\/server\/([^/]+)/.exec(pathname);
	const channel = /^\/channel\/([^/]+)/.exec(pathname);
	return {
		serverId: server?.[1],
		channelId: channel?.[1],
	};
}

export function AppShell({
	loading,
	title,
	children,
}: {
	loading: boolean;
	title: string;
	children: ReactNode;
}) {
	const isPhone = useMediaQuery("(max-width: 767px)");
	const [channelListWidth, setChannelListWidth] = useAtom(channelListWidthAtom);
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const { serverId: routeServerId, channelId } = routeIds(pathname);
	const channel = useChannelSnapshot(channelId);
	const serverId = routeServerId ?? channel?.serverId ?? undefined;
	const serverChannels = useServerChannels(serverId);
	const servers = useServerList();
	const conversations = useDirectMessageList();
	const savedNotesId = useSavedNotesChannelId();
	const me = useMeSnapshot();
	const invalidate = useInvalidateShellQueries();
	useShellLiveSync(!loading, invalidate);

	const sidebar = serverId ? (
		<ServerSidebar snapshot={serverChannels} loading={loading} />
	) : (
		<HomeSidebar
			conversations={conversations}
			savedNotesId={savedNotesId}
			loading={loading}
		/>
	);

	const channelColumn = (
		<>
			{sidebar}
			<UserVoiceTray me={me} />
		</>
	);

	const chrome = (
		<>
			<ServerRail servers={servers} loading={loading} />
			<div className="flex h-full min-w-0 flex-1 flex-col">{channelColumn}</div>
		</>
	);

	if (isPhone) {
		return (
			<div
				data-testid="app-shell"
				className="dark flex h-svh flex-col overflow-hidden app-canvas text-foreground"
				style={{ colorScheme: "dark" }}
			>
				<header className="flex h-12 shrink-0 items-center gap-2 border-b-[3px] border-border app-canvas px-2">
					<Sheet>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Open navigation"
								/>
							}
						>
							<Menu className="size-5" />
						</SheetTrigger>
						<SheetContent
							side="left"
							showCloseButton={false}
							className="h-full w-[304px] max-w-[304px] flex-row gap-0 border-r-[3px] border-border p-0 sm:max-w-[304px]"
						>
							<SheetTitle className="sr-only">Navigation</SheetTitle>
							{chrome}
						</SheetContent>
					</Sheet>
					<span className="text-sm font-bold tracking-tight">{title}</span>
				</header>
				<div className="flex min-h-0 flex-1">{children}</div>
			</div>
		);
	}

	return (
		<div
			data-testid="app-shell"
			className="dark flex h-svh overflow-hidden rail-surface text-foreground"
			style={{ colorScheme: "dark" }}
		>
			<ServerRail servers={servers} loading={loading} />
			<div
				className="relative flex h-full shrink-0 flex-col"
				style={{ width: channelListWidth }}
				data-testid="channel-list-pane"
			>
				{channelColumn}
				<PanelResizeHandle
					edge="right"
					value={channelListWidth}
					min={CHANNEL_LIST_WIDTH.min}
					max={CHANNEL_LIST_WIDTH.max}
					onChange={setChannelListWidth}
					aria-label="Resize channel list"
					testId="channel-list-resize-handle"
				/>
			</div>
			<div className="flex min-h-0 min-w-0 flex-1">{children}</div>
		</div>
	);
}
