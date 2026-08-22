import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const connect = vi.fn();
const once = vi.fn();
const removeListener = vi.fn();
const ready = vi.fn(() => false);
const disconnect = vi.fn();
const removeAllListeners = vi.fn();
const initConfig = vi.fn(async () => undefined);
const useExistingSession = vi.fn();
const getMe = vi.fn(async () => ({ _id: "01USER" }));

vi.mock("stoat.js", () => {
	class Client {
		options = { baseURL: "https://api.test" };
		events = { disconnect };
		api = { get: getMe };
		user: { id: string } | undefined;
		ready = ready;
		connect = connect;
		once = once;
		removeListener = removeListener;
		removeAllListeners = removeAllListeners;
		initConfig = initConfig;
		["useExistingSession"] = useExistingSession;
	}
	return { Client };
});

vi.mock("@/lib/env", () => ({
	stoatApiBaseUrl: () => "https://api.test",
}));

describe("establishSession", () => {
	afterEach(async () => {
		vi.resetModules();
		connect.mockClear();
		once.mockClear();
		removeListener.mockClear();
		ready.mockReset();
		ready.mockReturnValue(false);
		disconnect.mockClear();
		removeAllListeners.mockClear();
		initConfig.mockClear();
		useExistingSession.mockClear();
		getMe.mockClear();
	});

	it("shares one connect across concurrent calls for the same session", async () => {
		once.mockImplementation((event: string, handler: () => void) => {
			if (event === "ready") {
				queueMicrotask(() => {
					ready.mockReturnValue(true);
					handler();
				});
			}
		});

		const { establishSession, resetStoatClient } = await import(
			"@/lib/stoat-client"
		);
		resetStoatClient();

		const session = {
			_id: "01SESSION",
			token: "tok",
			userId: "01USER",
		};

		const [a, b] = await Promise.all([
			establishSession(session),
			establishSession(session),
		]);

		expect(a).toBe("websocket");
		expect(b).toBe("websocket");
		expect(connect).toHaveBeenCalledTimes(1);
	});

	it("does not reconnect when the client is already ready for the user", async () => {
		ready.mockReturnValue(true);

		const { establishSession, getStoatClient, resetStoatClient } = await import(
			"@/lib/stoat-client"
		);
		resetStoatClient();
		const client = getStoatClient();
		Object.assign(client, { user: { id: "01USER" } });

		const result = await establishSession({
			_id: "01SESSION",
			token: "tok",
			userId: "01USER",
		});

		expect(result).toBe("websocket");
		expect(connect).not.toHaveBeenCalled();
	});
});
