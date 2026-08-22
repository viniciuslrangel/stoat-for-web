import { useSetAtom } from "jotai";
import { useState } from "react";

import { sessionAtom } from "@/domain/session";
import { messageForLoginFailure } from "@/lib/auth-error";
import { loginWithMfa, loginWithPassword } from "@/lib/authenticate";
import { completeLogin, finishOnboarding } from "@/lib/complete-login";
import type { LoginResult, MfaMethod } from "@/lib/login-result";
import { usernameValidationMessage } from "@/lib/onboarding";
import {
	clearPersistedSession,
	type PersistedSession,
} from "@/lib/session-persist";

export type LoginStatus =
	| { kind: "idle" }
	| { kind: "submitting" }
	| {
			kind: "mfa";
			ticket: string;
			allowedMethods: readonly MfaMethod[];
			error?: string;
	  }
	| { kind: "onboarding"; session: PersistedSession; error?: string }
	| { kind: "onboarding-submitting"; session: PersistedSession }
	| { kind: "error"; message: string };

export function useLogin(): {
	status: LoginStatus;
	login: (email: string, password: string) => Promise<LoginResult | null>;
	submitMfa: (code: string) => Promise<LoginResult | null>;
	submitUsername: (username: string) => Promise<boolean>;
	cancelOnboarding: () => void;
} {
	const setSession = useSetAtom(sessionAtom);
	const [status, setStatus] = useState<LoginStatus>({ kind: "idle" });

	async function finishSuccess(
		result: Extract<LoginResult, { kind: "success" }>,
	): Promise<LoginResult | null> {
		try {
			const completion = await completeLogin(result, setSession);
			if (completion.kind === "onboarding") {
				setStatus(completion);
				return null;
			} else if (completion.kind === "ready") {
				setStatus({ kind: "idle" });
			} else {
				setStatus({
					kind: "error",
					message: "Could not verify the session with the Stoat server.",
				});
				return null;
			}
			return result;
		} catch (error) {
			setStatus({ kind: "error", message: messageForLoginFailure(error) });
			return null;
		}
	}

	async function handleResult(
		result: LoginResult,
	): Promise<LoginResult | null> {
		if (result.kind === "success") {
			return finishSuccess(result);
		}
		if (result.kind === "mfa") {
			setStatus({
				kind: "mfa",
				ticket: result.ticket,
				allowedMethods: result.allowedMethods,
			});
			return result;
		}
		setStatus({ kind: "error", message: "This account is disabled." });
		return result;
	}

	async function login(
		email: string,
		password: string,
	): Promise<LoginResult | null> {
		setStatus({ kind: "submitting" });
		try {
			return await handleResult(await loginWithPassword({ email, password }));
		} catch (error) {
			setStatus({ kind: "error", message: messageForLoginFailure(error) });
			return null;
		}
	}

	async function submitMfa(code: string): Promise<LoginResult | null> {
		if (status.kind !== "mfa") {
			setStatus({ kind: "error", message: "Enter email and password first." });
			return null;
		}
		const challenge = status;
		setStatus({ kind: "submitting" });
		try {
			return await handleResult(
				await loginWithMfa({
					ticket: challenge.ticket,
					code,
					allowedMethods: challenge.allowedMethods,
				}),
			);
		} catch (error) {
			setStatus({
				kind: "mfa",
				ticket: challenge.ticket,
				allowedMethods: challenge.allowedMethods,
				error: messageForLoginFailure(error),
			});
			return null;
		}
	}

	async function submitUsername(username: string): Promise<boolean> {
		if (status.kind !== "onboarding") {
			setStatus({
				kind: "error",
				message: "Log in before choosing a username.",
			});
			return false;
		}
		const session = status.session;
		const trimmed = username.trim();
		const validationMessage = usernameValidationMessage(trimmed);
		if (validationMessage) {
			setStatus({
				kind: "onboarding",
				session,
				error: validationMessage,
			});
			return false;
		}
		setStatus({ kind: "onboarding-submitting", session });
		try {
			const result = await finishOnboarding(session, trimmed, setSession);
			if (result === "ready") {
				setStatus({ kind: "idle" });
				return true;
			}
			setStatus({ kind: "error", message: "Could not finish onboarding." });
			return false;
		} catch (error) {
			setStatus({
				kind: "onboarding",
				session,
				error: messageForLoginFailure(error),
			});
			return false;
		}
	}

	function cancelOnboarding(): void {
		if (
			status.kind !== "onboarding" &&
			status.kind !== "onboarding-submitting"
		) {
			return;
		}
		clearPersistedSession();
		setSession({ kind: "anonymous" });
		setStatus({ kind: "idle" });
	}

	return { status, login, submitMfa, submitUsername, cancelOnboarding };
}
