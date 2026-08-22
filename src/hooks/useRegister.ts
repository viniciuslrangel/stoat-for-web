import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useState } from "react";

import { sessionAtom } from "@/domain/session";
import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { messageForAccountFailure } from "@/lib/account-error";
import { authFeaturesQueryKey, fetchAuthFeatures } from "@/lib/auth-features";
import { loginWithPassword } from "@/lib/authenticate";
import { completeLogin, finishOnboarding } from "@/lib/complete-login";
import { createAccount } from "@/lib/register";
import {
	clearPersistedSession,
	type PersistedSession,
} from "@/lib/session-persist";

export type RegisterStatus =
	| { kind: "idle" }
	| { kind: "submitting" }
	| { kind: "onboarding"; session: PersistedSession; error?: string }
	| { kind: "onboarding-submitting"; session: PersistedSession }
	| { kind: "error"; message: string };

export type RegisterOutcome =
	| { kind: "logged-in" }
	| { kind: "check-email" }
	| { kind: "need-login" }
	| { kind: "onboarding" };

export function useRegister(): {
	status: RegisterStatus;
	register: (input: {
		email: string;
		password: string;
		invite?: string;
	}) => Promise<RegisterOutcome | null>;
	submitUsername: (username: string) => Promise<boolean>;
	cancelOnboarding: () => void;
} {
	const queryClient = useQueryClient();
	const setSession = useSetAtom(sessionAtom);
	const setCheckEmail = useSetAtom(pendingCheckEmailAtom);
	const [status, setStatus] = useState<RegisterStatus>({ kind: "idle" });

	async function register(input: {
		email: string;
		password: string;
		invite?: string;
	}): Promise<RegisterOutcome | null> {
		setStatus({ kind: "submitting" });
		try {
			const features = await queryClient.fetchQuery({
				queryKey: authFeaturesQueryKey,
				queryFn: fetchAuthFeatures,
			});
			await createAccount({
				email: input.email,
				password: input.password,
				invite: input.invite,
			});
			setCheckEmail(input.email);
			if (features.emailVerification) {
				setStatus({ kind: "idle" });
				return { kind: "check-email" };
			}
			const loginResult = await loginWithPassword({
				email: input.email,
				password: input.password,
			});
			if (loginResult.kind === "success") {
				const finished = await completeLogin(loginResult, setSession);
				if (finished.kind === "error") {
					setStatus({ kind: "idle" });
					return { kind: "need-login" };
				}
				if (finished.kind === "onboarding") {
					setStatus(finished);
					return { kind: "onboarding" };
				}
				setStatus({ kind: "idle" });
				return { kind: "logged-in" };
			}
			setStatus({ kind: "idle" });
			return { kind: "need-login" };
		} catch (error) {
			setStatus({
				kind: "error",
				message: messageForAccountFailure(error),
			});
			return null;
		}
	}

	async function submitUsername(username: string): Promise<boolean> {
		if (status.kind !== "onboarding") {
			setStatus({
				kind: "error",
				message: "Register before choosing a username.",
			});
			return false;
		}
		const session = status.session;
		const trimmed = username.trim();
		if (trimmed.length < 2) {
			setStatus({
				kind: "onboarding",
				session,
				error: "Username must be at least 2 characters.",
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
				error: messageForAccountFailure(error),
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

	return { status, register, submitUsername, cancelOnboarding };
}
