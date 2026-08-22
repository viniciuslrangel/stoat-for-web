import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

export type SettingsCloseAction =
	| { kind: "back" }
	| { kind: "navigate"; to: "/app" };

export function resolveSettingsCloseAction(
	canGoBack: boolean,
): SettingsCloseAction {
	if (canGoBack) {
		return { kind: "back" };
	}
	return { kind: "navigate", to: "/app" };
}

export function useSettingsOverlay(): { close: () => void } {
	const router = useRouter();

	const close = useCallback(() => {
		const action = resolveSettingsCloseAction(router.history.canGoBack());
		if (action.kind === "back") {
			router.history.back();
			return;
		}
		void router.navigate({ to: action.to });
	}, [router]);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape" || event.isComposing) {
				return;
			}
			event.preventDefault();
			close();
		}
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [close]);

	return { close };
}
