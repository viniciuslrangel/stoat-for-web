import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { UserPlus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
	FriendRow,
	type FriendRowHandlers,
} from "@/components/friends/FriendRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user";
import {
	FRIEND_TAB_EMPTY,
	FRIEND_TABS,
	type FriendRow as FriendRowModel,
	type FriendsSnapshot,
	friendTag,
	pendingBadgeLabel,
} from "@/hooks/friends-snapshots";
import { useFriendCommands, useFriends } from "@/hooks/useFriends";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { friendsTabAtom, parseFriendsTab } from "@/state/prefs";

function sectionTitle(label: string, count: number): string {
	return `${label} — ${count}`;
}

function FriendList({
	title,
	rows,
	empty,
	handlers,
}: {
	title: string;
	rows: readonly FriendRowModel[];
	empty: string;
	handlers: FriendRowHandlers;
}) {
	return (
		<div className="px-4 py-4">
			<div className="px-2 pb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
				{sectionTitle(title, rows.length)}
			</div>
			{rows.length === 0 ? (
				<p className="px-2 py-6 text-sm text-muted-foreground">{empty}</p>
			) : (
				<ul className="list-none p-0">
					{rows.map((row) => (
						<FriendRow key={row.id} row={row} handlers={handlers} />
					))}
				</ul>
			)}
		</div>
	);
}

export function FriendsView({
	loading,
	lists,
	handlers,
	onAddFriend,
}: {
	loading: boolean;
	lists: FriendsSnapshot;
	handlers: FriendRowHandlers;
	onAddFriend: (username: string) => Promise<void>;
}) {
	const isPhone = useMediaQuery("(max-width: 767px)");
	const [friendsTab, setFriendsTab] = useAtom(friendsTabAtom);
	const [addOpen, setAddOpen] = useState(false);
	const [username, setUsername] = useState("");
	const [adding, setAdding] = useState(false);
	const pendingCount = pendingBadgeLabel(lists.incoming.length);

	async function handleAdd(event: FormEvent) {
		event.preventDefault();
		setAdding(true);
		try {
			await onAddFriend(username);
			setUsername("");
			setAddOpen(false);
			toast.success("Friend request sent.");
		} catch {
			return;
		} finally {
			setAdding(false);
		}
	}

	return (
		<main
			data-testid="screen-friends"
			className="flex min-h-0 min-w-0 flex-1 flex-col app-canvas text-foreground"
		>
			<Tabs
				value={friendsTab}
				onValueChange={(value) => {
					setFriendsTab(parseFriendsTab(value));
				}}
				className="flex min-h-0 flex-1 flex-col gap-0"
			>
				<header className="flex h-12 shrink-0 items-center gap-3 border-b-[3px] border-border px-4">
					{isPhone ? null : (
						<>
							<Users className="size-5 text-foreground" />
							<h1 className="text-base font-bold tracking-tight">Friends</h1>
							<div className="mx-1 h-6 w-px bg-border" />
						</>
					)}
					<TabsList
						variant="line"
						className="h-8 min-w-0 flex-1 bg-transparent p-0"
					>
						{FRIEND_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value} className="px-2">
								{tab.label}
								{tab.value === "pending" && pendingCount ? (
									<Badge
										variant="destructive"
										className="ml-1 h-4 min-w-4 px-1 text-[10px]"
									>
										{pendingCount}
									</Badge>
								) : null}
							</TabsTrigger>
						))}
					</TabsList>
					<Button
						type="button"
						size="sm"
						className="bg-success text-primary-foreground hover:bg-success/90"
						onClick={() => setAddOpen(true)}
					>
						<UserPlus className="size-4" />
						Add friend
					</Button>
				</header>
				{loading ? (
					<div className="p-6">
						<Skeleton className="h-12 w-full rounded-md border-[3px] border-border bg-muted" />
					</div>
				) : (
					<div className="min-h-0 flex-1 overflow-auto">
						<TabsContent value="online">
							<FriendList
								title="Online"
								rows={lists.online}
								empty={FRIEND_TAB_EMPTY.online}
								handlers={handlers}
							/>
						</TabsContent>
						<TabsContent value="all">
							<FriendList
								title="All"
								rows={lists.all}
								empty={FRIEND_TAB_EMPTY.all}
								handlers={handlers}
							/>
						</TabsContent>
						<TabsContent value="pending">
							{lists.incoming.length === 0 && lists.outgoing.length === 0 ? (
								<FriendList
									title="Pending"
									rows={[]}
									empty={FRIEND_TAB_EMPTY.pending}
									handlers={handlers}
								/>
							) : (
								<>
									<FriendList
										title="Incoming"
										rows={lists.incoming}
										empty="No incoming requests."
										handlers={handlers}
									/>
									<FriendList
										title="Outgoing"
										rows={lists.outgoing}
										empty="No outgoing requests."
										handlers={handlers}
									/>
								</>
							)}
						</TabsContent>
						<TabsContent value="blocked">
							<FriendList
								title="Blocked"
								rows={lists.blocked}
								empty={FRIEND_TAB_EMPTY.blocked}
								handlers={handlers}
							/>
						</TabsContent>
					</div>
				)}
			</Tabs>
			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent className="dark bg-background text-foreground sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add a new friend</DialogTitle>
						<DialogDescription>
							Enter a username and discriminator.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={(event) => void handleAdd(event)}>
						<div className="grid gap-2 py-2">
							<Label htmlFor="friend-username">Username</Label>
							<Input
								id="friend-username"
								value={username}
								onChange={(event) => setUsername(event.target.value)}
								placeholder="username#1234"
								autoComplete="off"
							/>
						</div>
						<DialogFooter className="bg-transparent">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setAddOpen(false)}
							>
								Close
							</Button>
							<Button
								type="submit"
								disabled={adding || username.trim().length === 0}
								className="bg-success text-primary-foreground hover:bg-success/90"
							>
								Send request
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</main>
	);
}

export function FriendProfileDialog({
	row,
	onClose,
	onMessage,
}: {
	row: FriendRowModel | null;
	onClose: () => void;
	onMessage: (row: FriendRowModel) => void;
}) {
	if (!row) {
		return null;
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent className="dark bg-background text-foreground sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Profile</DialogTitle>
					<DialogDescription className="sr-only">
						{row.displayName}
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-3 py-2">
					<UserAvatar
						name={row.displayName}
						src={row.avatarUrl || null}
						presence={row.presence}
						size="lg"
						surface="background"
						showPresence={row.relationship === "Friend"}
					/>
					<div className="min-w-0">
						<div className="truncate text-base font-bold tracking-tight">
							{row.displayName}
						</div>
						<div className="truncate text-sm text-muted-foreground">
							{friendTag(row)}
						</div>
					</div>
				</div>
				<DialogFooter className="bg-transparent">
					{row.relationship === "Blocked" ? null : (
						<Button type="button" onClick={() => onMessage(row)}>
							Message
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function FriendsPage({ loading }: { loading: boolean }) {
	const navigate = useNavigate();
	const friends = useFriends();
	const commands = useFriendCommands();
	const [profile, setProfile] = useState<FriendRowModel | null>(null);

	async function openDm(row: FriendRowModel) {
		const channelId = await commands.mutateAsync({
			kind: "openDm",
			userId: row.id,
		});
		if (!channelId) {
			return;
		}
		setProfile(null);
		await navigate({
			to: "/channel/$channelId",
			params: { channelId },
		});
	}

	const handlers: FriendRowHandlers = {
		onOpenDm: (row) => {
			void openDm(row);
		},
		onOpenProfile: setProfile,
		onAccept: (row) => {
			void commands.mutateAsync({ kind: "accept", userId: row.id });
		},
		onRemove: (row) => {
			void commands.mutateAsync({ kind: "remove", userId: row.id });
		},
		onBlock: (row) => {
			void commands.mutateAsync({ kind: "block", userId: row.id });
		},
		onUnblock: (row) => {
			void commands.mutateAsync({ kind: "unblock", userId: row.id });
		},
	};

	return (
		<>
			<FriendsView
				loading={loading || friends.loading}
				lists={friends.lists}
				handlers={handlers}
				onAddFriend={async (username) => {
					await commands.mutateAsync({ kind: "add", username });
				}}
			/>
			<FriendProfileDialog
				row={profile}
				onClose={() => setProfile(null)}
				onMessage={(row) => {
					void openDm(row);
				}}
			/>
		</>
	);
}
