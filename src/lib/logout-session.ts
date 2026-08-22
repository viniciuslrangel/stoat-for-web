export type LogoutPorts = {
	disconnectVoice: () => Promise<void>;
	logoutRemote: () => Promise<void>;
	resetClient: () => void;
	clearPersistedSession: () => void;
	clearQueryCache: () => void;
	setAnonymousSession: () => void;
	navigateToLogin: () => Promise<void>;
};

export type LogoutOutcome = {
	kind: "completed";
	voice: "succeeded" | "failed";
	remote: "succeeded" | "failed" | "skipped";
};

async function tryAsync(action: () => Promise<void>): Promise<boolean> {
	try {
		await action();
		return true;
	} catch {
		return false;
	}
}

function trySync(action: () => void): void {
	try {
		action();
	} catch {
		// Logout must continue clearing the remaining local state.
	}
}

export async function logoutSession({
	signedIn,
	ports,
}: {
	signedIn: boolean;
	ports: LogoutPorts;
}): Promise<LogoutOutcome> {
	const voice = (await tryAsync(ports.disconnectVoice))
		? "succeeded"
		: "failed";
	const remote = !signedIn
		? "skipped"
		: (await tryAsync(ports.logoutRemote))
			? "succeeded"
			: "failed";

	trySync(ports.resetClient);
	trySync(ports.clearPersistedSession);
	trySync(ports.clearQueryCache);
	trySync(ports.setAnonymousSession);
	await tryAsync(ports.navigateToLogin);

	return { kind: "completed", voice, remote };
}
