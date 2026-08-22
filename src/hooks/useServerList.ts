import { useQuery } from "@tanstack/react-query";
import type { Client } from "stoat.js";

import {
	type ServerSnapshot,
	type ServerSnapshotInput,
	snapshotServers,
} from "@/hooks/shell-snapshots";
import { useSignedInUserId } from "@/hooks/useSignedInGate";
import { getStoatClient } from "@/lib/stoat-client";

export function serverListQueryKey(userId: string) {
	return ["shell", userId, "servers"] as const;
}

function readServerInputs(client: Client): ServerSnapshotInput[] {
	const inputs: ServerSnapshotInput[] = [];
	for (const server of client.servers.toList()) {
		try {
			let iconUrl: string | undefined;
			try {
				iconUrl = server.iconURL;
			} catch {
				iconUrl = undefined;
			}
			inputs.push({
				id: server.id,
				name: server.name,
				iconUrl,
			});
		} catch {}
	}
	return inputs;
}

export function loadServerSnapshots(): ServerSnapshot[] {
	return snapshotServers(readServerInputs(getStoatClient()));
}

export function useServerList(): ServerSnapshot[] {
	const userId = useSignedInUserId();

	const query = useQuery({
		queryKey: userId
			? serverListQueryKey(userId)
			: ["shell", "anonymous", "servers"],
		queryFn: loadServerSnapshots,
		enabled: userId !== null,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: "always",
	});

	return query.data ?? [];
}
