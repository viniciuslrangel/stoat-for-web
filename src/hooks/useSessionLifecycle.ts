import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { sessionAtom } from "@/domain/session";
import { activateSession } from "@/lib/activate-session";
import {
	fetchInstanceConfig,
	instanceConfigQueryKey,
} from "@/lib/instance-config";
import {
	clearPersistedSession,
	loadPersistedSession,
} from "@/lib/session-persist";
import { resetStoatClient } from "@/lib/stoat-client";

export function useSessionLifecycle(): void {
	const setSession = useSetAtom(sessionAtom);

	useQuery({
		queryKey: instanceConfigQueryKey,
		queryFn: fetchInstanceConfig,
	});

	useEffect(() => {
		const persisted = loadPersistedSession();
		if (!persisted) {
			return;
		}
		let cancelled = false;
		setSession({ kind: "authenticating" });
		void activateSession(persisted)
			.then(() => {
				if (!cancelled) {
					setSession({ kind: "ready", userId: persisted.userId });
				}
			})
			.catch(() => {
				clearPersistedSession();
				resetStoatClient();
				if (!cancelled) {
					setSession({ kind: "anonymous" });
				}
			});
		return () => {
			cancelled = true;
		};
	}, [setSession]);
}
