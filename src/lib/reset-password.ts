import { accountRequest } from "@/lib/account-request";

export async function requestPasswordReset(input: {
	email: string;
	captcha?: string;
}): Promise<void> {
	const body: Record<string, string> = { email: input.email };
	if (input.captcha && input.captcha.length > 0) {
		body.captcha = input.captcha;
	}
	await accountRequest({
		method: "POST",
		path: "/auth/account/reset_password",
		body,
	});
}

export async function confirmPasswordReset(input: {
	token: string;
	password: string;
	removeSessions: boolean;
}): Promise<void> {
	await accountRequest({
		method: "PATCH",
		path: "/auth/account/reset_password",
		body: {
			password: input.password,
			token: input.token,
			remove_sessions: input.removeSessions,
		},
	});
}
