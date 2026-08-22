import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const testApiUrl = "http://stoat.test/api";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_STOAT_API_URL: z.url(),
	},
	runtimeEnv: {
		VITE_STOAT_API_URL:
			import.meta.env.VITE_STOAT_API_URL ||
			(import.meta.env.MODE === "test"
				? testApiUrl
				: import.meta.env.VITE_STOAT_API_URL),
	},
	emptyStringAsUndefined: true,
	skipValidation: import.meta.env.MODE === "test",
});

export function stoatApiBaseUrl(): string {
	const url = env.VITE_STOAT_API_URL;
	if (!url) {
		throw new Error("VITE_STOAT_API_URL is not set");
	}
	return url.replace(/\/$/, "");
}
