import { useQuery } from "@tanstack/react-query";

import {
	type MeSnapshot,
	meFromRest,
	snapshotMe,
} from "@/hooks/shell-snapshots";
import { autumnBaseUrl } from "@/hooks/useShellLiveSync";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { userAvatarUrlFromSdk } from "@/lib/avatar-url";
import { getStoatClient } from "@/lib/stoat-client";

export function meSnapshotQueryKey(userId: string) {
	return ["shell", userId, "me"] as const;
}

export async function loadMeSnapshot(): Promise<MeSnapshot | null> {
	const client = getStoatClient();
	const user = client.user;
	if (user) {
		try {
			const avatarUrl = userAvatarUrlFromSdk(user);
			if (!avatarUrl) {
				return null;
			}
			return snapshotMe({
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl,
				online: user.online,
				presence: user.presence,
			});
		} catch {
			return null;
		}
	}

	try {
		const me = await client.api.get("/users/@me");
		return meFromRest(me, autumnBaseUrl(client), client.options.baseURL);
	} catch {
		return null;
	}
}

export function useMeSnapshot(): MeSnapshot | null {
	const userId = useSignedInUserId();

	const query = useQuery({
		queryKey: userId
			? meSnapshotQueryKey(userId)
			: ["shell", "anonymous", "me"],
		queryFn: loadMeSnapshot,
		enabled: userId !== null,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	return query.data ?? null;
}
