import { accountRequest } from "@/lib/account-request";

export async function resendVerification(input: {
	email: string;
	captcha?: string;
}): Promise<void> {
	const body: Record<string, string> = { email: input.email };
	if (input.captcha && input.captcha.length > 0) {
		body.captcha = input.captcha;
	}
	await accountRequest({
		method: "POST",
		path: "/auth/account/reverify",
		body,
	});
}
