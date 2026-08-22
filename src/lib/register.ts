import { accountRequest } from "@/lib/account-request";

export type CreateAccountInput = {
	email: string;
	password: string;
	invite?: string;
	captcha?: string;
};

export async function createAccount(input: CreateAccountInput): Promise<void> {
	const body: Record<string, string> = {
		email: input.email,
		password: input.password,
	};
	if (input.invite && input.invite.length > 0) {
		body.invite = input.invite;
	}
	if (input.captcha && input.captcha.length > 0) {
		body.captcha = input.captcha;
	}
	await accountRequest({
		method: "POST",
		path: "/auth/account/create",
		body,
	});
}
