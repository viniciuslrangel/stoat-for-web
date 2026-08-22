import type { Session } from "@/domain/session";
import { activateSession } from "@/lib/activate-session";
import type { LoginResult } from "@/lib/login-result";
import {
	checkOnboarding,
	completeOnboarding as submitOnboarding,
} from "@/lib/onboarding";
import {
	clearPersistedSession,
	type PersistedSession,
	savePersistedSession,
} from "@/lib/session-persist";
import { resetStoatClient } from "@/lib/stoat-client";

export type LoginCompletion =
	| { kind: "ready" }
	| { kind: "onboarding"; session: PersistedSession }
	| { kind: "error" };

export async function completeLogin(
	result: Extract<LoginResult, { kind: "success" }>,
	setSession: (session: Session) => void,
): Promise<LoginCompletion> {
	const persisted: PersistedSession = {
		_id: result.sessionId,
		token: result.token,
		userId: result.userId,
		valid: false,
	};
	savePersistedSession(persisted);
	setSession({ kind: "authenticating" });
	try {
		if ((await checkOnboarding(persisted)).onboarding) {
			return { kind: "onboarding", session: persisted };
		}
		await activateSession(persisted);
		setSession({ kind: "ready", userId: result.userId });
		return { kind: "ready" };
	} catch {
		clearPersistedSession();
		resetStoatClient();
		setSession({ kind: "anonymous" });
		return { kind: "error" };
	}
}

export async function finishOnboarding(
	session: PersistedSession,
	username: string,
	setSession: (session: Session) => void,
): Promise<"ready" | "error"> {
	await submitOnboarding(session, username.trim());
	try {
		await activateSession(session);
		setSession({ kind: "ready", userId: session.userId });
		return "ready";
	} catch {
		clearPersistedSession();
		resetStoatClient();
		setSession({ kind: "anonymous" });
		return "error";
	}
}
