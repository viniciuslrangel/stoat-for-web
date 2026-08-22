export function friendlyName(input?: {
	userAgent?: string;
	maxTouchPoints?: number;
}): string {
	const userAgent = input?.userAgent ?? globalThis.navigator?.userAgent ?? "";
	const maxTouchPoints =
		input?.maxTouchPoints ?? globalThis.navigator?.maxTouchPoints ?? 0;
	if (!userAgent) {
		return "Stoat for Web (Unknown Device)";
	}

	let browser = "browser";
	if (/edg\//i.test(userAgent)) {
		browser = "edge";
	} else if (/firefox|fxios/i.test(userAgent)) {
		browser = "firefox";
	} else if (/opr\//i.test(userAgent)) {
		browser = "opera";
	} else if (/chrome|crios/i.test(userAgent)) {
		browser = "chrome";
	} else if (/safari/i.test(userAgent)) {
		browser = "safari";
	}

	let os = "OS";
	if (/windows/i.test(userAgent)) {
		os = "Windows";
	} else if (/android/i.test(userAgent)) {
		os = "Android";
	} else if (
		/iphone|ipad|ipod/i.test(userAgent) ||
		(/mac os/i.test(userAgent) && maxTouchPoints > 0)
	) {
		os = /iphone|ipod/i.test(userAgent) ? "iOS" : "iPadOS";
		if (browser === "browser") {
			browser = "safari";
		}
	} else if (/mac os/i.test(userAgent)) {
		os = "Mac OS";
	} else if (/linux/i.test(userAgent)) {
		os = "Linux";
	}

	return `Stoat for Web (${browser} on ${os})`;
}
