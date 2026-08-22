import { useSetAtom } from "jotai";
import { useState } from "react";

import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { messageForAccountFailure } from "@/lib/account-error";
import {
	confirmPasswordReset,
	requestPasswordReset,
} from "@/lib/reset-password";

export type ResetStatus =
	| { kind: "idle" }
	| { kind: "submitting" }
	| { kind: "error"; message: string };

export function useResetPassword(): {
	status: ResetStatus;
	requestReset: (email: string) => Promise<"check-email" | null>;
	confirmReset: (input: {
		token: string;
		password: string;
		removeSessions: boolean;
	}) => Promise<"done" | null>;
} {
	const setCheckEmail = useSetAtom(pendingCheckEmailAtom);
	const [status, setStatus] = useState<ResetStatus>({ kind: "idle" });

	async function requestReset(email: string): Promise<"check-email" | null> {
		setStatus({ kind: "submitting" });
		try {
			await requestPasswordReset({ email });
			setCheckEmail(email);
			setStatus({ kind: "idle" });
			return "check-email";
		} catch (error) {
			setStatus({
				kind: "error",
				message: messageForAccountFailure(error),
			});
			return null;
		}
	}

	async function confirmReset(input: {
		token: string;
		password: string;
		removeSessions: boolean;
	}): Promise<"done" | null> {
		setStatus({ kind: "submitting" });
		try {
			await confirmPasswordReset(input);
			setStatus({ kind: "idle" });
			return "done";
		} catch (error) {
			setStatus({
				kind: "error",
				message: messageForAccountFailure(error),
			});
			return null;
		}
	}

	return { status, requestReset, confirmReset };
}
