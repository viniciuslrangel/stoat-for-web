import { useSetAtom } from "jotai";
import { useState } from "react";

import { pendingCheckEmailAtom } from "@/hooks/pending-check-email";
import { messageForAccountFailure } from "@/lib/account-error";
import { resendVerification } from "@/lib/resend-verification";

export type ResendStatus =
	| { kind: "idle" }
	| { kind: "submitting" }
	| { kind: "error"; message: string };

export function useResendVerification(): {
	status: ResendStatus;
	resend: (email: string) => Promise<"check-email" | null>;
} {
	const setCheckEmail = useSetAtom(pendingCheckEmailAtom);
	const [status, setStatus] = useState<ResendStatus>({ kind: "idle" });

	async function resend(email: string): Promise<"check-email" | null> {
		setStatus({ kind: "submitting" });
		try {
			await resendVerification({ email });
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

	return { status, resend };
}
