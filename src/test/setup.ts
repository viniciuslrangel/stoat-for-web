import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
	cleanup();
});

/**
 * Node 22+ exposes a broken experimental `localStorage` (undefined without
 * `--localstorage-file`) that shadows jsdom's Storage. Prefer a working store.
 */
function installMemoryLocalStorage(): void {
	const map = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return map.size;
		},
		clear() {
			map.clear();
		},
		getItem(key) {
			return map.has(key) ? (map.get(key) ?? null) : null;
		},
		key(index) {
			return [...map.keys()][index] ?? null;
		},
		removeItem(key) {
			map.delete(key);
		},
		setItem(key, value) {
			map.set(String(key), String(value));
		},
	};
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		enumerable: true,
		value: storage,
	});
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		enumerable: true,
		value: storage,
	});
}

try {
	const probe = globalThis.localStorage;
	if (
		!probe ||
		typeof probe.getItem !== "function" ||
		typeof probe.setItem !== "function"
	) {
		installMemoryLocalStorage();
	} else {
		probe.setItem("__stoat_ls_probe__", "1");
		probe.removeItem("__stoat_ls_probe__");
	}
} catch {
	installMemoryLocalStorage();
}

class MatchMediaList extends EventTarget implements MediaQueryList {
	matches = false;
	onchange: MediaQueryList["onchange"] = null;

	constructor(readonly media: string) {
		super();
	}

	addListener(): void {}
	removeListener(): void {}
}

if (typeof window.matchMedia !== "function") {
	window.matchMedia = (query: string) => new MatchMediaList(query);
}

class ResizeObserverStub implements ResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
	globalThis.ResizeObserver = ResizeObserverStub;
}

if (typeof Element !== "undefined") {
	if (typeof Element.prototype.hasPointerCapture !== "function") {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (typeof Element.prototype.setPointerCapture !== "function") {
		Element.prototype.setPointerCapture = () => {};
	}
	if (typeof Element.prototype.releasePointerCapture !== "function") {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (typeof Element.prototype.scrollIntoView !== "function") {
		Element.prototype.scrollIntoView = () => {};
	}
	if (typeof Element.prototype.getAnimations !== "function") {
		Element.prototype.getAnimations = () => [];
	}
}
