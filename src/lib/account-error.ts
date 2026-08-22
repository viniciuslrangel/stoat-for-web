import { AuthRequestError, messageForLoginFailure } from "@/lib/auth-error";

const ACCOUNT_MESSAGES: Record<string, string> = {
	InvalidInvite: "That invite code is not valid.",
	MissingInvite: "This server requires an invite code.",
	CaptchaFailed: "Captcha failed. Try again.",
	InvalidToken: "This link is invalid or has expired.",
	EmailFailed: "Could not send that email. Try again.",
	AlreadyVerified: "This account is already verified. Try logging in.",
};

export function messageForAccountFailure(error: unknown): string {
	if (error instanceof AuthRequestError) {
		const mapped = ACCOUNT_MESSAGES[error.type];
		if (mapped) {
			return mapped;
		}
	}
	return messageForLoginFailure(error);
}
