import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useState } from "react";

import { sessionAtom } from "@/domain/session";
import { messageForAccountFailure } from "@/lib/account-error";
import { completeLogin } from "@/lib/complete-login";
import { loginWithTicket, verifyAccount } from "@/lib/verify-email";

export type VerifyStatus =
	| { kind: "pending" }
	| { kind: "success"; mfaTicket: string | null }
	| { kind: "error"; message: string };

export type VerifyContinueStatus =
	| { kind: "idle" }
	| { kind: "submitting" }
	| { kind: "error"; message: string };

export function useVerifyEmail(token: string): {
	status: VerifyStatus;
	continueStatus: VerifyContinueStatus;
	continueToApp: () => Promise<"logged-in" | "need-login" | null>;
} {
	const setSession = useSetAtom(sessionAtom);
	const [continueStatus, setContinueStatus] = useState<VerifyContinueStatus>({
		kind: "idle",
	});
	const query = useQuery({
		queryKey: ["verify-email", token],
		queryFn: () => verifyAccount(token),
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});

	let status: VerifyStatus;
	if (query.isPending) {
		status = { kind: "pending" };
	} else if (query.isError) {
		status = {
			kind: "error",
			message: messageForAccountFailure(query.error),
		};
	} else {
		status = {
			kind: "success",
			mfaTicket: query.data.mfaTicket,
		};
	}

	async function continueToApp(): Promise<"logged-in" | "need-login" | null> {
		if (status.kind !== "success" || !status.mfaTicket) {
			return null;
		}
		const ticket = status.mfaTicket;
		setContinueStatus({ kind: "submitting" });
		try {
			const result = await loginWithTicket(ticket);
			if (result.kind !== "success") {
				setContinueStatus({ kind: "idle" });
				return "need-login";
			}
			const finished = await completeLogin(result, setSession);
			if (finished.kind !== "ready") {
				setContinueStatus({ kind: "idle" });
				return "need-login";
			}
			setContinueStatus({ kind: "idle" });
			return "logged-in";
		} catch (error) {
			setContinueStatus({
				kind: "error",
				message: messageForAccountFailure(error),
			});
			return null;
		}
	}

	return { status, continueStatus, continueToApp };
}
