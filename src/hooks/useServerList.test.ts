import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { loadServerSnapshots } from "@/hooks/useServerList";
import { getStoatClient } from "@/lib/stoat-client";

vi.mock("@/lib/stoat-client", () => ({
	getStoatClient: vi.fn(),
}));

describe("loadServerSnapshots", () => {
	beforeEach(() => {
		vi.mocked(getStoatClient).mockReset();
	});

	it("returns hydrated servers from the client collection", () => {
		vi.mocked(getStoatClient).mockReturnValue({
			servers: {
				toList: () => [
					{
						id: "01M0J8S8MCNJZGXS4E9RKFZTYA",
						name: "test_e2e_1787319590429",
						get iconURL() {
							return undefined;
						},
					},
				],
			},
		} as never);

		expect(loadServerSnapshots()).toEqual([
			{
				id: "01M0J8S8MCNJZGXS4E9RKFZTYA",
				name: "test_e2e_1787319590429",
				iconUrl: null,
			},
		]);
	});

	it("fails closed when the collection is empty after a missed Ready", () => {
		vi.mocked(getStoatClient).mockReturnValue({
			servers: {
				toList: () => [],
			},
		} as never);

		expect(loadServerSnapshots()).toEqual([]);
	});
});
