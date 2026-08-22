import { Check, MoreVertical, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user";
import {
	type FriendRow as FriendRowModel,
	friendSubtitle,
	friendTag,
} from "@/hooks/friends-snapshots";

export type FriendRowHandlers = {
	onOpenDm: (row: FriendRowModel) => void;
	onOpenProfile: (row: FriendRowModel) => void;
	onAccept: (row: FriendRowModel) => void;
	onRemove: (row: FriendRowModel) => void;
	onBlock: (row: FriendRowModel) => void;
	onUnblock: (row: FriendRowModel) => void;
};

async function copyUsername(row: FriendRowModel): Promise<void> {
	try {
		await navigator.clipboard.writeText(friendTag(row));
	} catch {
		toast.error("Could not copy username.");
	}
}

function Identity({ row }: { row: FriendRowModel }) {
	return (
		<>
			<div className="truncate text-sm font-semibold text-foreground">
				{row.displayName}
			</div>
			<div className="truncate text-xs text-muted-foreground">
				{friendSubtitle(row)}
			</div>
		</>
	);
}

export function FriendRow({
	row,
	handlers,
}: {
	row: FriendRowModel;
	handlers: FriendRowHandlers;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const opensDm = row.relationship === "Friend";

	function openMenu(event: { preventDefault: () => void }) {
		event.preventDefault();
		setMenuOpen(true);
	}

	return (
		<li
			data-testid={`friend-row-${row.id}`}
			className="group flex h-14 items-center gap-3 rounded-sm border-[3px] border-transparent px-2 hover:border-border hover:bg-accent"
		>
			<button
				type="button"
				aria-label={`Profile for ${row.displayName}`}
				className="relative shrink-0"
				onClick={() => handlers.onOpenProfile(row)}
				onContextMenu={openMenu}
			>
				<UserAvatar
					name={row.displayName}
					src={row.avatarUrl || null}
					presence={row.presence}
					size="default"
					surface="background"
					showPresence={row.relationship === "Friend"}
				/>
			</button>
			<button
				type="button"
				className="min-w-0 flex-1 text-left"
				aria-label={opensDm ? `Message ${row.displayName}` : row.displayName}
				onClick={() => {
					if (opensDm) {
						handlers.onOpenDm(row);
					} else {
						handlers.onOpenProfile(row);
					}
				}}
				onContextMenu={openMenu}
			>
				<Identity row={row} />
			</button>
			{row.relationship === "Incoming" ? (
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Accept ${row.displayName}`}
						className="text-success hover:bg-success/15 hover:text-success"
						onClick={() => handlers.onAccept(row)}
					>
						<Check className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Ignore ${row.displayName}`}
						className="text-destructive hover:bg-destructive/15 hover:text-destructive"
						onClick={() => handlers.onRemove(row)}
					>
						<X className="size-4" />
					</Button>
				</div>
			) : null}
			<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={`Actions for ${row.displayName}`}
							className="text-zinc-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
						/>
					}
				>
					<MoreVertical className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-40">
					<DropdownMenuItem onClick={() => handlers.onOpenProfile(row)}>
						Profile
					</DropdownMenuItem>
					{row.relationship !== "Blocked" ? (
						<DropdownMenuItem onClick={() => handlers.onOpenDm(row)}>
							Message
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem onClick={() => void copyUsername(row)}>
						Copy username
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{row.relationship === "Friend" ? (
						<>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => handlers.onRemove(row)}
							>
								Remove friend
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => handlers.onBlock(row)}
							>
								Block
							</DropdownMenuItem>
						</>
					) : null}
					{row.relationship === "Incoming" ? (
						<>
							<DropdownMenuItem onClick={() => handlers.onAccept(row)}>
								Accept
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handlers.onRemove(row)}>
								Ignore
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => handlers.onBlock(row)}
							>
								Block
							</DropdownMenuItem>
						</>
					) : null}
					{row.relationship === "Outgoing" ? (
						<>
							<DropdownMenuItem onClick={() => handlers.onRemove(row)}>
								Cancel request
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => handlers.onBlock(row)}
							>
								Block
							</DropdownMenuItem>
						</>
					) : null}
					{row.relationship === "Blocked" ? (
						<DropdownMenuItem onClick={() => handlers.onUnblock(row)}>
							Unblock
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
