export type AuthError = {
	type: string;
	message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

const LOGIN_MESSAGES: Record<string, string> = {
	InvalidCredentials: "Email or password is wrong.",
	UnverifiedAccount:
		"This account is not verified. Check your inbox and try again.",
	LockedOut: "Too many failed attempts. Wait a few minutes and try again.",
	CompromisedPassword:
		"This password has appeared in a data leak. Use another password.",
	ShortPassword: "Password must be at least 8 characters.",
	InvalidSession: "Please log in again.",
	FeatureDisabled: "This sign-in method is disabled on this server.",
	Disabled: "This account is disabled.",
	InvalidUsername: "This username is not allowed.",
	UsernameTaken: "This username is already taken.",
};

export function parseApiError(raw: unknown): AuthError {
	if (!isRecord(raw)) {
		return { type: "Unknown", message: "Something went wrong. Try again." };
	}
	const serverMessage =
		typeof raw.error === "string" && raw.error.length > 0
			? raw.error
			: typeof raw.message === "string" && raw.message.length > 0
				? raw.message
				: undefined;
	if (typeof raw.type === "string" && raw.type.length > 0) {
		return {
			type: raw.type,
			message:
				serverMessage ??
				LOGIN_MESSAGES[raw.type] ??
				"Something went wrong. Try again.",
		};
	}
	if (serverMessage) {
		return { type: "Unknown", message: serverMessage };
	}
	return { type: "Unknown", message: "Something went wrong. Try again." };
}

export function messageForLoginFailure(error: unknown): string {
	if (error instanceof TypeError && error.message === "Failed to fetch") {
		return "Could not reach the Stoat server.";
	}
	if (error instanceof Error && error.name === "AuthError") {
		return error.message;
	}
	return parseApiError(error).message;
}

export class AuthRequestError extends Error {
	readonly type: string;
	override readonly name = "AuthError";

	constructor(error: AuthError) {
		super(error.message);
		this.type = error.type;
	}
}
