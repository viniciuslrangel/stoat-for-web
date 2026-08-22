import { useNavigate } from "@tanstack/react-router";
import { Fragment, type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user";
import type { MeSnapshot } from "@/hooks/shell-snapshots";
import { cn } from "@/lib/utils";

export type UserAccountMenuActionId = "settings" | "copy-id";

export type UserAccountMenuAction =
	| { id: "settings"; label: "User Settings"; kind: "navigate" }
	| { id: "copy-id"; label: "Copy User ID"; kind: "copy" };

/** Account actions for the signed-in user card. Logout / status omitted until APIs exist. */
export const USER_ACCOUNT_MENU_ACTIONS: readonly UserAccountMenuAction[] = [
	{ id: "settings", label: "User Settings", kind: "navigate" },
	{ id: "copy-id", label: "Copy User ID", kind: "copy" },
];

async function copyUserId(userId: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(userId);
		toast.success("User ID copied");
	} catch {
		toast.error("Could not copy user ID.");
	}
}

/**
 * Discord-like click-self menu for the bottom-left user tray.
 * Opens upward; Escape / outside click close via DropdownMenu.
 */
export function UserAccountMenu({
	me,
	subtitle,
}: {
	me: MeSnapshot | null;
	subtitle: ReactNode;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	function runAction(action: UserAccountMenuAction): void {
		setOpen(false);
		if (action.kind === "navigate") {
			void navigate({ to: "/settings" });
			return;
		}
		if (me) {
			void copyUserId(me.id);
		}
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				data-testid="user-tray-avatar-menu"
				aria-label={me ? `Account menu for ${me.displayName}` : "Account menu"}
				className={cn(
					"flex min-w-0 flex-1 items-center gap-2 rounded-md border-[3px] border-transparent px-1 py-1 text-left",
					"hover:border-border hover:bg-sidebar-accent",
					"outline-none focus-visible:border-border focus-visible:bg-sidebar-accent",
					"data-popup-open:border-border data-popup-open:bg-sidebar-accent",
				)}
			>
				{me ? (
					<UserAvatar
						name={me.displayName}
						src={me.avatarUrl}
						presence={me.presence}
						size="default"
						surface="sidebar"
						fallbackClassName="bg-raised text-foreground"
					/>
				) : (
					<div className="size-8 shrink-0 rounded-full bg-muted" />
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-semibold text-foreground">
						{me?.displayName ?? "…"}
					</p>
					{subtitle}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="top"
				sideOffset={6}
				className="min-w-44"
				data-testid="user-account-menu"
			>
				{USER_ACCOUNT_MENU_ACTIONS.map((action, index) => (
					<Fragment key={action.id}>
						{index > 0 ? <DropdownMenuSeparator /> : null}
						<DropdownMenuItem
							disabled={action.kind === "copy" && !me}
							onClick={() => runAction(action)}
							data-testid={`user-account-menu-${action.id}`}
						>
							{action.label}
						</DropdownMenuItem>
					</Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
