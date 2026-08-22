import { describe, expect, it } from "vite-plus/test";

import {
	clampScreenShareVolume,
	effectiveScreenShareElementVolume,
	getScreenShareMuted,
	getScreenShareVolume,
	parseScreenShareListenerPrefs,
	storedScreenShareVolume,
	withScreenShareMuted,
	withScreenShareVolume,
} from "./screen-share-listener";

describe("storedScreenShareVolume", () => {
	it("keeps 0 as silence instead of falling back to 1", () => {
		expect(storedScreenShareVolume(0)).toBe(0);
		expect(storedScreenShareVolume(undefined)).toBe(1);
		expect(storedScreenShareVolume(Number.NaN)).toBe(1);
	});
});

describe("screen share mute defaults", () => {
	it("defaults missing mute entries to muted", () => {
		expect(getScreenShareMuted({ mutes: {}, volumes: {} }, "alice")).toBe(true);
		expect(
			getScreenShareMuted({ mutes: { alice: false }, volumes: {} }, "alice"),
		).toBe(false);
	});
});

describe("screen share volume helpers", () => {
	it("clamps and multiplies master and share volumes", () => {
		expect(clampScreenShareVolume(4)).toBe(3);
		expect(getScreenShareVolume({ mutes: {}, volumes: {} }, "alice")).toBe(1);
		expect(effectiveScreenShareElementVolume(1, 0)).toBe(0);
		expect(effectiveScreenShareElementVolume(0.5, 0.5)).toBe(0.25);
		expect(effectiveScreenShareElementVolume(2, 1)).toBe(1);
	});

	it("updates mute and volume immutably", () => {
		const base = parseScreenShareListenerPrefs(null);
		const unmuted = withScreenShareMuted(base, "alice", false);
		const lowered = withScreenShareVolume(unmuted, "alice", 0);
		expect(unmuted.mutes.alice).toBe(false);
		expect(lowered.volumes.alice).toBe(0);
		expect(base.mutes.alice).toBeUndefined();
	});
});
