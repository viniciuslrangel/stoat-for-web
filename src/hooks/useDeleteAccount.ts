import { useQuery } from "@tanstack/react-query";

import { messageForAccountFailure } from "@/lib/account-error";
import { deleteAccountByToken } from "@/lib/delete-account";

export type DeleteAccountStatus =
	| { kind: "pending" }
	| { kind: "success" }
	| { kind: "error"; message: string };

export function useDeleteAccount(token: string): DeleteAccountStatus {
	const query = useQuery({
		queryKey: ["delete-account", token],
		queryFn: async () => {
			await deleteAccountByToken(token);
			return true;
		},
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});
	if (query.isPending) {
		return { kind: "pending" };
	}
	if (query.isError) {
		return {
			kind: "error",
			message: messageForAccountFailure(query.error),
		};
	}
	return { kind: "success" };
}
