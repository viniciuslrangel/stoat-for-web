import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Client } from "stoat.js";

import { type ChannelId, parseChannelId, type UserId } from "@/domain/ids";
import {
	emptyFriendsSnapshot,
	type FriendSnapshotInput,
	type FriendsSnapshot,
	snapshotFriends,
} from "@/hooks/friends-snapshots";
import {
	useInvalidateShellQueries,
	useSignedInUserId,
} from "@/hooks/useSignedInGate";
import { parseApiError } from "@/lib/auth-error";
import { userAvatarUrlFromSdk } from "@/lib/avatar-url";
import { getStoatClient } from "@/lib/stoat-client";

export function friendsListQueryKey(userId: string) {
	return ["shell", userId, "friends"] as const;
}

export type FriendCommand =
	| { kind: "add"; username: string }
	| { kind: "openDm"; userId: UserId }
	| { kind: "accept"; userId: UserId }
	| { kind: "remove"; userId: UserId }
	| { kind: "block"; userId: UserId }
	| { kind: "unblock"; userId: UserId };

const FRIEND_ERROR_MESSAGES: Record<string, string> = {
	AlreadyFriends: "Already friends with this user.",
	AlreadySentRequest: "You've already sent a request to this user.",
	Blocked: "You have this user blocked.",
	BlockedByOther: "This user has blocked you.",
	NotFound: "Could not find that user.",
	TooManyPendingFriendRequests: "You've sent too many friend requests.",
	NoEffect: "That action had no effect.",
};

function readFriendInputs(client: Client): FriendSnapshotInput[] {
	const inputs: FriendSnapshotInput[] = [];
	for (const user of client.users.toList()) {
		try {
			let avatarUrl: string | undefined;
			try {
				avatarUrl = userAvatarUrlFromSdk(user);
			} catch {
				avatarUrl = undefined;
			}
			let statusText: string | undefined;
			try {
				statusText = user.status?.text ?? undefined;
			} catch {
				statusText = undefined;
			}
			inputs.push({
				id: user.id,
				username: user.username,
				discriminator: user.discriminator,
				displayName: user.displayName,
				avatarUrl,
				relationship: user.relationship,
				online: user.online,
				presence: user.presence,
				statusText,
				isBot: Boolean(user.bot),
			});
		} catch {}
	}
	return inputs;
}

export function loadFriendsSnapshot(): FriendsSnapshot {
	return snapshotFriends(readFriendInputs(getStoatClient()));
}

export function useFriends(): { lists: FriendsSnapshot; loading: boolean } {
	const userId = useSignedInUserId();

	const query = useQuery({
		queryKey: userId
			? friendsListQueryKey(userId)
			: ["shell", "anonymous", "friends"],
		queryFn: loadFriendsSnapshot,
		enabled: userId !== null,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	return {
		lists: query.data ?? emptyFriendsSnapshot(),
		loading: query.isPending && query.data === undefined,
	};
}

function requireUser(client: Client, userId: UserId) {
	const user = client.users.get(userId);
	if (!user) {
		throw new Error("User not found");
	}
	return user;
}

export async function executeFriendCommand(
	command: FriendCommand,
): Promise<ChannelId | undefined> {
	const client = getStoatClient();
	switch (command.kind) {
		case "add": {
			const username = command.username.trim();
			if (username.length === 0) {
				throw new Error("Enter a username.");
			}
			await client.api.post("/users/friend", { username });
			return undefined;
		}
		case "openDm": {
			const channel = await requireUser(client, command.userId).openDM();
			return parseChannelId(channel.id);
		}
		case "accept": {
			await requireUser(client, command.userId).addFriend();
			return undefined;
		}
		case "remove": {
			await requireUser(client, command.userId).removeFriend();
			return undefined;
		}
		case "block": {
			await requireUser(client, command.userId).blockUser();
			return undefined;
		}
		case "unblock": {
			await requireUser(client, command.userId).unblockUser();
			return undefined;
		}
		default: {
			const _exhaustive: never = command;
			return _exhaustive;
		}
	}
}

export function messageForFriendFailure(error: unknown): string {
	if (error instanceof Error && error.message === "Enter a username.") {
		return error.message;
	}
	if (error instanceof Error && error.message === "User not found") {
		return "Could not find that user.";
	}
	const parsed = parseApiError(error);
	return FRIEND_ERROR_MESSAGES[parsed.type] ?? parsed.message;
}

export function useFriendCommands() {
	const invalidate = useInvalidateShellQueries();
	return useMutation({
		mutationFn: executeFriendCommand,
		onSuccess: () => {
			invalidate();
		},
		onError: (error) => {
			toast.error(messageForFriendFailure(error));
		},
	});
}
