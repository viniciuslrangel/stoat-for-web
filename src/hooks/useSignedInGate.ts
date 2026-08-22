import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useCallback, useEffect } from "react";

import { sessionAtom, sessionUserId } from "@/domain/session";

export const NEXT_PATH_KEY = "stoat.nextPath";

export type SignedInGate =
	| { status: "anonymous" }
	| { status: "loading" }
	| { status: "ready"; userId: string };

export function useSignedInGate(): SignedInGate {
	const session = useAtomValue(sessionAtom);
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	useEffect(() => {
		if (session.kind !== "anonymous") {
			return;
		}
		if (pathname === "/login" || pathname.startsWith("/login/")) {
			return;
		}
		sessionStorage.setItem(NEXT_PATH_KEY, pathname);
	}, [pathname, session.kind]);

	switch (session.kind) {
		case "anonymous":
			return { status: "anonymous" };
		case "authenticating":
			return { status: "loading" };
		case "ready":
		case "reconnecting":
		case "offline":
			return { status: "ready", userId: session.userId };
	}
}

export function useSignedInUserId(): string | null {
	return sessionUserId(useAtomValue(sessionAtom));
}

export function useInvalidateShellQueries(): () => void {
	const queryClient = useQueryClient();
	const userId = useSignedInUserId();
	return useCallback(() => {
		if (!userId) {
			return;
		}
		void queryClient.invalidateQueries({ queryKey: ["shell", userId] });
	}, [queryClient, userId]);
}
