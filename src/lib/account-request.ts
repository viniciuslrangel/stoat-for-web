import { AuthRequestError, parseApiError } from "@/lib/auth-error";
import { stoatApiBaseUrl } from "@/lib/env";

export async function accountRequest(input: {
	method: "POST" | "PATCH" | "PUT";
	path: string;
	body?: unknown;
}): Promise<unknown> {
	const response = await fetch(`${stoatApiBaseUrl()}${input.path}`, {
		method: input.method,
		headers:
			input.body === undefined
				? undefined
				: { "Content-Type": "application/json" },
		body: input.body === undefined ? undefined : JSON.stringify(input.body),
	});
	const text = await response.text();
	let payload: unknown = null;
	if (text.length > 0) {
		try {
			payload = JSON.parse(text) as unknown;
		} catch {
			payload = null;
		}
	}
	if (!response.ok) {
		throw new AuthRequestError(parseApiError(payload));
	}
	return payload;
}
