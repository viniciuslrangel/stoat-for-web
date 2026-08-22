import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";

import { isSignedIn, sessionAtom } from "@/domain/session";
import { type LogoutOutcome, logoutSession } from "@/lib/logout-session";
import { clearPersistedSession } from "@/lib/session-persist";
import { getStoatClient, resetStoatClient } from "@/lib/stoat-client";
import { voiceRuntime } from "@/lib/voice/voice-runtime";

export type LogoutStatus =
	| { kind: "idle" }
	| { kind: "pending" }
	| { kind: "completed"; outcome: LogoutOutcome };

export function useLogout(): {
	status: LogoutStatus;
	logout: () => Promise<LogoutOutcome>;
} {
	const session = useAtomValue(sessionAtom);
	const setSession = useSetAtom(sessionAtom);
	const queryClient = useQueryClient();
	const router = useRouter();
	const inFlight = useRef<Promise<LogoutOutcome> | null>(null);
	const [status, setStatus] = useState<LogoutStatus>({ kind: "idle" });

	function logout(): Promise<LogoutOutcome> {
		if (inFlight.current) {
			return inFlight.current;
		}

		const promise = logoutSession({
			signedIn: isSignedIn(session),
			ports: {
				disconnectVoice: () => voiceRuntime.disconnect(),
				logoutRemote: () => getStoatClient().logout(),
				resetClient: resetStoatClient,
				clearPersistedSession,
				clearQueryCache: () => queryClient.clear(),
				setAnonymousSession: () => setSession({ kind: "anonymous" }),
				navigateToLogin: () =>
					router.navigate({ to: "/login/auth", replace: true }),
			},
		});
		inFlight.current = promise;
		setStatus({ kind: "pending" });

		void promise.then((outcome) => {
			if (inFlight.current === promise) {
				inFlight.current = null;
				setStatus({ kind: "completed", outcome });
			}
		});

		return promise;
	}

	return { status, logout };
}
