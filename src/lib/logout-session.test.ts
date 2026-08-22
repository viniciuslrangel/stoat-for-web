import { describe, expect, it } from "vite-plus/test";

import { type LogoutPorts, logoutSession } from "./logout-session";

function makePorts(
	events: string[],
	failures: Set<string> = new Set(),
): LogoutPorts {
	const action =
		(name: string): (() => Promise<void>) =>
		async () => {
			events.push(name);
			if (failures.has(name)) {
				throw new Error("private test failure");
			}
		};

	return {
		disconnectVoice: action("voice"),
		logoutRemote: action("remote"),
		resetClient: () => {
			events.push("reset");
			if (failures.has("reset")) {
				throw new Error("private test failure");
			}
		},
		clearPersistedSession: () => {
			events.push("persisted");
			if (failures.has("persisted")) {
				throw new Error("private test failure");
			}
		},
		clearQueryCache: () => {
			events.push("cache");
			if (failures.has("cache")) {
				throw new Error("private test failure");
			}
		},
		setAnonymousSession: () => {
			events.push("anonymous");
			if (failures.has("anonymous")) {
				throw new Error("private test failure");
			}
		},
		navigateToLogin: action("navigate"),
	};
}

describe("logoutSession", () => {
	it("runs teardown in order and skips remote logout anonymously", async () => {
		const events: string[] = [];

		const outcome = await logoutSession({
			signedIn: false,
			ports: makePorts(events),
		});

		expect(events).toEqual([
			"voice",
			"reset",
			"persisted",
			"cache",
			"anonymous",
			"navigate",
		]);
		expect(outcome).toEqual({
			kind: "completed",
			voice: "succeeded",
			remote: "skipped",
		});
	});

	it("continues local teardown when voice and remote logout fail", async () => {
		const events: string[] = [];

		const outcome = await logoutSession({
			signedIn: true,
			ports: makePorts(events, new Set(["voice", "remote"])),
		});

		expect(events).toEqual([
			"voice",
			"remote",
			"reset",
			"persisted",
			"cache",
			"anonymous",
			"navigate",
		]);
		expect(outcome).toEqual({
			kind: "completed",
			voice: "failed",
			remote: "failed",
		});
	});

	it("continues local teardown when a local step fails", async () => {
		const events: string[] = [];

		await logoutSession({
			signedIn: true,
			ports: makePorts(
				events,
				new Set(["reset", "persisted", "cache", "anonymous", "navigate"]),
			),
		});

		expect(events).toEqual([
			"voice",
			"remote",
			"reset",
			"persisted",
			"cache",
			"anonymous",
			"navigate",
		]);
	});
});
