import { describe, expect, it } from "vite-plus/test";

import {
	DEFAULT_SCREEN_SHARE_QUALITY,
	parseScreenShareQualityName,
	screenShareCaptureOptions,
	screenSharePublishOptions,
	screenShareQualityByName,
} from "./screen-share-profile";

describe("screen share quality", () => {
	it("defaults to gaming", () => {
		expect(parseScreenShareQualityName("nope")).toBe(
			DEFAULT_SCREEN_SHARE_QUALITY,
		);
		expect(screenShareQualityByName("gaming")).toMatchObject({
			width: 1920,
			height: 1080,
			frameRate: 60,
			maxBitrate: 18_000_000,
		});
	});

	it("builds capture and publish options without simulcast", () => {
		const quality = screenShareQualityByName("gaming");
		expect(screenShareCaptureOptions(quality)).toMatchObject({
			contentHint: "motion",
			resolution: { width: 1920, height: 1080, frameRate: 60 },
			audio: {
				autoGainControl: false,
				echoCancellation: false,
				noiseSuppression: false,
			},
		});
		expect(screenSharePublishOptions(quality)).toMatchObject({
			degradationPreference: "maintain-framerate",
			screenShareSimulcastLayers: [],
			screenShareEncoding: {
				maxBitrate: 18_000_000,
				maxFramerate: 60,
			},
		});
	});
});
