import { useRouterState } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "stoat.forceVoiceStage";
const EVENT = "stoat-force-voice-stage";

function readStorageFlag(): boolean {
	try {
		return sessionStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

function subscribeStorage(onStoreChange: () => void): () => void {
	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY || event.key === null) {
			onStoreChange();
		}
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener(EVENT, onStoreChange);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(EVENT, onStoreChange);
	};
}

/** URL `?forceVoiceStage=1` or sessionStorage flag for visual proof without a real video track. */
export function useForceVoiceStage(): boolean {
	const fromUrl = useRouterState({
		select: (state) =>
			new URLSearchParams(state.location.searchStr).get("forceVoiceStage") ===
			"1",
	});
	const fromStorage = useSyncExternalStore(
		subscribeStorage,
		readStorageFlag,
		() => false,
	);
	return fromUrl || fromStorage;
}

export function setForceVoiceStageForProof(enabled: boolean): void {
	try {
		if (enabled) {
			sessionStorage.setItem(STORAGE_KEY, "1");
		} else {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new Event(EVENT));
}
