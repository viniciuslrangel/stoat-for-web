import { accountRequest } from "@/lib/account-request";

export async function deleteAccountByToken(token: string): Promise<void> {
	await accountRequest({
		method: "PUT",
		path: "/auth/account/delete",
		body: { token },
	});
}
