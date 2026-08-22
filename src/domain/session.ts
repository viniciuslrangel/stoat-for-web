import { atom } from "jotai";

import type { UserId } from "@/domain/ids";

export type Session =
	| { kind: "anonymous" }
	| { kind: "authenticating" }
	| { kind: "ready"; userId: UserId }
	| { kind: "reconnecting"; userId: UserId }
	| { kind: "offline"; userId: UserId };

export type SignedInSession = Extract<Session, { userId: UserId }>;

export const sessionAtom = atom<Session>({ kind: "anonymous" });

export function isSignedIn(session: Session): session is SignedInSession {
	switch (session.kind) {
		case "ready":
		case "reconnecting":
		case "offline":
			return true;
		case "anonymous":
		case "authenticating":
			return false;
	}
}

export function sessionUserId(session: Session): UserId | null {
	return isSignedIn(session) ? session.userId : null;
}

export const signedInUserIdAtom = atom((get) =>
	sessionUserId(get(sessionAtom)),
);
