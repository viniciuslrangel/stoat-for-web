import type {
	ScreenShareCaptureOptions,
	TrackPublishOptions,
} from "livekit-client";

export const SCREEN_SHARE_QUALITY_NAMES = [
	"low",
	"high",
	"gaming",
	"text",
] as const;

export type ScreenShareQualityName =
	(typeof SCREEN_SHARE_QUALITY_NAMES)[number];

export type ScreenShareContentHint = "motion" | "detail" | "text";

export type ScreenShareQuality = {
	name: ScreenShareQualityName;
	width: number;
	height: number;
	frameRate: number;
	maxBitrate?: number;
	contentHint: ScreenShareContentHint;
	fullName: string;
};

/** 720p30 — always available. */
export const SCREEN_SHARE_QUALITY_LOW: ScreenShareQuality = {
	name: "low",
	width: 1280,
	height: 720,
	frameRate: 30,
	maxBitrate: 1_500_000,
	contentHint: "motion",
	fullName: "720p 30FPS",
};

/** 1080p60 @ 12 Mbps. */
export const SCREEN_SHARE_QUALITY_HIGH: ScreenShareQuality = {
	name: "high",
	width: 1920,
	height: 1080,
	frameRate: 60,
	maxBitrate: 12_000_000,
	contentHint: "motion",
	fullName: "1080p 60FPS",
};

/** 1080p60 @ 18 Mbps — games / fast motion (fork default). */
export const SCREEN_SHARE_QUALITY_GAMING: ScreenShareQuality = {
	name: "gaming",
	width: 1920,
	height: 1080,
	frameRate: 60,
	maxBitrate: 18_000_000,
	contentHint: "motion",
	fullName: "1080p 60FPS Gaming",
};

/** Source resolution @ 5fps for documents. */
export const SCREEN_SHARE_QUALITY_TEXT: ScreenShareQuality = {
	name: "text",
	width: 0,
	height: 0,
	frameRate: 5,
	contentHint: "text",
	fullName: "Source 5FPS",
};

export const DEFAULT_SCREEN_SHARE_QUALITY: ScreenShareQualityName = "gaming";

export function parseScreenShareQualityName(
	value: unknown,
): ScreenShareQualityName {
	if (
		value === "low" ||
		value === "high" ||
		value === "gaming" ||
		value === "text"
	) {
		return value;
	}
	return DEFAULT_SCREEN_SHARE_QUALITY;
}

export function screenShareQualityByName(
	name: ScreenShareQualityName,
): ScreenShareQuality {
	switch (name) {
		case "low":
			return SCREEN_SHARE_QUALITY_LOW;
		case "high":
			return SCREEN_SHARE_QUALITY_HIGH;
		case "text":
			return SCREEN_SHARE_QUALITY_TEXT;
		default:
			return SCREEN_SHARE_QUALITY_GAMING;
	}
}

export function screenShareCaptureOptions(
	quality: ScreenShareQuality,
): ScreenShareCaptureOptions {
	return {
		audio: {
			autoGainControl: false,
			echoCancellation: false,
			noiseSuppression: false,
		},
		video: true,
		contentHint: quality.contentHint,
		selfBrowserSurface: "exclude",
		systemAudio: "include",
		...(quality.width > 0 && quality.height > 0
			? {
					resolution: {
						width: quality.width,
						height: quality.height,
						frameRate: quality.frameRate,
					},
				}
			: {
					resolution: {
						width: 0,
						height: 0,
						frameRate: quality.frameRate,
					},
				}),
	};
}

export function screenSharePublishOptions(
	quality: ScreenShareQuality,
): TrackPublishOptions {
	return {
		degradationPreference: "maintain-framerate",
		screenShareSimulcastLayers: [],
		...(quality.maxBitrate
			? {
					screenShareEncoding: {
						maxBitrate: quality.maxBitrate,
						maxFramerate: quality.frameRate,
					},
				}
			: {}),
	};
}

/** Apply capture constraints + content hint after getDisplayMedia starts. */
export async function applyScreenShareTrackQuality(
	mediaTrack: MediaStreamTrack,
	quality: ScreenShareQuality,
): Promise<void> {
	const constraints: MediaTrackConstraints = {
		frameRate: { max: quality.frameRate },
	};
	if (quality.width > 0) {
		constraints.width = { ideal: quality.width, max: quality.width };
	}
	if (quality.height > 0) {
		constraints.height = { ideal: quality.height, max: quality.height };
	}
	await mediaTrack.applyConstraints(constraints);
	mediaTrack.contentHint = quality.contentHint;
}
