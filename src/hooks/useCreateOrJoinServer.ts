import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { parseServerId } from "@/domain/ids";
import {
	type InviteDestination,
	InviteRequestError,
	joinInvite,
} from "@/hooks/useInvite";
import {
	loadServerChannels,
	serverChannelsQueryKey,
} from "@/hooks/useServerChannels";
import { loadServerSnapshots, serverListQueryKey } from "@/hooks/useServerList";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { extractInviteCode } from "@/lib/invite-input";
import { getStoatClient } from "@/lib/stoat-client";

export async function joinServerFromInput(
	raw: string,
): Promise<InviteDestination> {
	const code = extractInviteCode(raw);
	if (!code) {
		throw new Error("Enter an invite code or link.");
	}
	return joinInvite(code);
}

export async function createServerNamed(name: string): Promise<string> {
	const trimmed = name.trim();
	if (trimmed.length === 0) {
		throw new Error("Enter a server name.");
	}
	if (trimmed.length > 32) {
		throw new Error("Server name must be 32 characters or fewer.");
	}
	const server = await getStoatClient().servers.createServer({ name: trimmed });
	return parseServerId(server.id);
}

export function messageForJoinServerFailure(error: unknown): string {
	if (
		error instanceof Error &&
		error.message === "Enter an invite code or link."
	) {
		return error.message;
	}
	if (error instanceof InviteRequestError) {
		return error.message;
	}
	if (error instanceof Error && error.message.length > 0) {
		return error.message;
	}
	return "Couldn't join that server. Try again.";
}

export function messageForCreateServerFailure(error: unknown): string {
	if (
		error instanceof Error &&
		(error.message === "Enter a server name." ||
			error.message === "Server name must be 32 characters or fewer.")
	) {
		return error.message;
	}
	if (error instanceof Error && error.message.length > 0) {
		return error.message;
	}
	return "Couldn't create that server. Try again.";
}

async function seedShellAfterServerJoin(
	queryClient: ReturnType<typeof useQueryClient>,
	userId: string,
	serverId: string,
): Promise<void> {
	queryClient.setQueryData(serverListQueryKey(userId), loadServerSnapshots());
	const channels = await loadServerChannels(serverId);
	if (channels) {
		queryClient.setQueryData(
			serverChannelsQueryKey(userId, serverId),
			channels,
		);
	}
}

export function useJoinServer() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const userId = useSignedInUserId();

	return useMutation({
		mutationFn: joinServerFromInput,
		onSuccess: async (destination) => {
			if (destination.kind === "server") {
				if (userId) {
					await seedShellAfterServerJoin(queryClient, userId, destination.id);
				}
				await navigate({
					to: "/server/$serverId",
					params: { serverId: destination.id },
				});
				return;
			}
			if (userId) {
				queryClient.setQueryData(
					serverListQueryKey(userId),
					loadServerSnapshots(),
				);
			}
			await navigate({
				to: "/channel/$channelId",
				params: { channelId: destination.id },
			});
		},
		onError: (error) => {
			toast.error(messageForJoinServerFailure(error));
		},
	});
}

export function useCreateServer() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const userId = useSignedInUserId();

	return useMutation({
		mutationFn: createServerNamed,
		onSuccess: async (serverId) => {
			if (userId) {
				await seedShellAfterServerJoin(queryClient, userId, serverId);
			}
			await navigate({
				to: "/server/$serverId",
				params: { serverId },
			});
		},
		onError: (error) => {
			toast.error(messageForCreateServerFailure(error));
		},
	});
}
