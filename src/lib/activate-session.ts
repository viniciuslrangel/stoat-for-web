import {
	markPersistedSessionValid,
	type PersistedSession,
} from "@/lib/session-persist";
import { establishSession } from "@/lib/stoat-client";

export async function activateSession(
	session: PersistedSession,
): Promise<void> {
	await establishSession(session);
	markPersistedSessionValid();
}
