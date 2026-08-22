import { Link, useRouterState } from "@tanstack/react-router";
import { House, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/user";
import type { ServerSnapshot } from "@/hooks/shell-snapshots";
import { cn } from "@/lib/utils";

function RailButton({
	active,
	label,
	children,
}: {
	active?: boolean;
	label: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"relative flex size-14 shrink-0 items-center justify-center",
				"before:absolute before:left-0 before:w-1 before:bg-foreground before:transition-all",
				active ? "before:h-8" : "before:h-0 hover:before:h-4",
			)}
		>
			<div className="sr-only">{label}</div>
			{children}
		</div>
	);
}

export function ServerRail({
	servers,
	loading,
}: {
	servers: readonly ServerSnapshot[];
	loading: boolean;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const homeActive = pathname === "/app" || pathname.startsWith("/app/");

	return (
		<nav
			data-testid="server-rail"
			aria-label="Servers"
			className="flex h-full w-14 shrink-0 flex-col items-center border-r-[3px] border-border rail-surface py-1"
		>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col items-center">
					<RailButton active={homeActive} label="Home">
						<Link
							to="/app"
							title="Home"
							aria-label="Home"
							aria-current={homeActive ? "page" : undefined}
							className={cn(
								"flex size-[42px] items-center justify-center rounded-full border-[3px] text-foreground transition-colors",
								homeActive
									? "border-foreground/30 primary-active-surface nb-shadow"
									: "border-border bg-raised hover:border-primary hover:bg-primary hover:text-primary-foreground",
							)}
						>
							<House className="size-5" />
						</Link>
					</RailButton>
					<div className="my-1 h-0.5 w-8 bg-border" />
					{loading
						? [0, 1, 2].map((key) => (
								<div
									key={key}
									className="flex size-14 items-center justify-center"
								>
									<Skeleton className="size-[42px] rounded-full border-[3px] border-border bg-raised" />
								</div>
							))
						: servers.map((server) => {
								const active = pathname.startsWith(`/server/${server.id}`);
								return (
									<RailButton
										key={server.id}
										active={active}
										label={server.name}
									>
										<Link
											to="/server/$serverId"
											params={{ serverId: server.id }}
											title={server.name}
											aria-label={server.name}
											className="block"
										>
											<EntityAvatar
												name={server.name}
												src={server.iconUrl}
												size="rail"
												bordered
												className={cn(
													"transition-colors",
													active && "border-primary nb-shadow",
												)}
												fallbackClassName="bg-raised text-foreground"
											/>
										</Link>
									</RailButton>
								);
							})}
					<RailButton label="Create or join a server">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							title="Create or join a server"
							aria-label="Create or join a server"
							className="size-[42px] rounded-full border-[3px] border-border bg-raised text-success hover:border-success hover:bg-success hover:text-primary-foreground"
						>
							<Plus className="size-5" />
						</Button>
					</RailButton>
				</div>
			</ScrollArea>
		</nav>
	);
}
