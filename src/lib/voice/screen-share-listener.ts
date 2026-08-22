/**
 * Per-sharer mute/volume for remote screen-share audio.
 * Mute defaults to true (opt-in listen). Volume 0 is silence — never coerce with `||`.
 */

export type ScreenShareListenerPrefs = {
	mutes: Record<string, boolean>;
	volumes: Record<string, number>;
};

export const DEFAULT_SCREEN_SHARE_LISTENER_PREFS: ScreenShareListenerPrefs = {
	mutes: {},
	volumes: {},
};

/** Fork invariant: missing/NaN volume falls back to 1; `0` stays `0`. */
export function storedScreenShareVolume(volume: number | undefined): number {
	const n = Number(volume);
	return Number.isFinite(n) ? n : 1;
}

export function clampScreenShareVolume(volume: number): number {
	const n = storedScreenShareVolume(volume);
	return Math.min(3, Math.max(0, n));
}

/** Missing mute entry means muted (default). */
export function getScreenShareMuted(
	prefs: ScreenShareListenerPrefs,
	identity: string,
): boolean {
	return prefs.mutes[identity] ?? true;
}

export function getScreenShareVolume(
	prefs: ScreenShareListenerPrefs,
	identity: string,
): number {
	return storedScreenShareVolume(prefs.volumes[identity]);
}

/**
 * Effective HTMLMediaElement.volume (0–1) for a remote share.
 * Output master * per-share, capped at 1 (no Web Audio boost yet).
 */
export function effectiveScreenShareElementVolume(
	outputVolume: number,
	shareVolume: number,
): number {
	const master = Number.isFinite(outputVolume) ? Math.max(0, outputVolume) : 1;
	const share = storedScreenShareVolume(shareVolume);
	return Math.min(1, Math.max(0, master * share));
}

export function parseScreenShareListenerPrefs(
	value: unknown,
): ScreenShareListenerPrefs {
	const next: ScreenShareListenerPrefs = {
		mutes: {},
		volumes: {},
	};
	if (value === null || typeof value !== "object") {
		return next;
	}
	const record = value as Record<string, unknown>;
	if (record.mutes && typeof record.mutes === "object") {
		for (const [key, muted] of Object.entries(
			record.mutes as Record<string, unknown>,
		)) {
			if (typeof muted === "boolean" && key.length > 0) {
				next.mutes[key] = muted;
			}
		}
	}
	if (record.volumes && typeof record.volumes === "object") {
		for (const [key, volume] of Object.entries(
			record.volumes as Record<string, unknown>,
		)) {
			if (typeof volume === "number" && key.length > 0) {
				next.volumes[key] = clampScreenShareVolume(volume);
			}
		}
	}
	return next;
}

export function withScreenShareMuted(
	prefs: ScreenShareListenerPrefs,
	identity: string,
	muted: boolean,
): ScreenShareListenerPrefs {
	return {
		...prefs,
		mutes: { ...prefs.mutes, [identity]: muted },
	};
}

export function withScreenShareVolume(
	prefs: ScreenShareListenerPrefs,
	identity: string,
	volume: number,
): ScreenShareListenerPrefs {
	return {
		...prefs,
		volumes: {
			...prefs.volumes,
			[identity]: clampScreenShareVolume(volume),
		},
	};
}
