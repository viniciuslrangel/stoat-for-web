import { useEffect } from "react";
import type { Client } from "stoat.js";

import { getStoatClient } from "@/lib/stoat-client";

const SHELL_EVENTS = [
	"ready",
	"serverCreate",
	"serverUpdate",
	"serverDelete",
	"serverLeave",
	"channelCreate",
	"channelUpdate",
	"channelDelete",
	"userUpdate",
] as const;

export function listenShellEvents(
	client: Client,
	onChange: () => void,
): () => void {
	for (const event of SHELL_EVENTS) {
		client.addListener(event, onChange);
	}
	return () => {
		for (const event of SHELL_EVENTS) {
			client.removeListener(event, onChange);
		}
	};
}

export function useShellLiveSync(enabled: boolean, onChange: () => void): void {
	useEffect(() => {
		if (!enabled) {
			return;
		}
		onChange();
		return listenShellEvents(getStoatClient(), onChange);
	}, [enabled, onChange]);
}

export function autumnBaseUrl(client: Client): string | null {
	const autumn = client.configuration?.features.autumn;
	if (
		!autumn?.enabled ||
		typeof autumn.url !== "string" ||
		autumn.url.length === 0
	) {
		return null;
	}
	return autumn.url;
}
