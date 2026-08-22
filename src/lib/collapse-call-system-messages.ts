import type { SystemMessageData } from "@/lib/system-message";

/** Default: collapse adjacent call_started rows when each gap is under 1 hour. */
export const CALL_COLLAPSE_WINDOW_MS = 3_600_000;

export type CallCollapsibleMessage = {
	createdAt: number;
	system: SystemMessageData | null;
};

/**
 * Hide earlier call_started system rows in an adjacent run; keep only the last.
 *
 * Rule: chronological list. A run is consecutive call_started messages with the
 * same initiator (byId) where each successive createdAt gap is < windowMs.
 * Any non-call message breaks the run. Non-call system messages are never merged.
 */
export function collapseCallSystemMessages<T extends CallCollapsibleMessage>(
	messages: readonly T[],
	options: { windowMs?: number } = {},
): T[] {
	const windowMs = options.windowMs ?? CALL_COLLAPSE_WINDOW_MS;
	const hide = new Set<number>();
	let run: number[] = [];

	const flush = () => {
		if (run.length > 1) {
			for (let i = 0; i < run.length - 1; i++) {
				const hiddenIndex = run[i];
				if (hiddenIndex !== undefined) {
					hide.add(hiddenIndex);
				}
			}
		}
		run = [];
	};

	for (let index = 0; index < messages.length; index++) {
		const message = messages[index];
		if (!message || message.system?.type !== "call_started") {
			flush();
			continue;
		}

		if (run.length === 0) {
			run.push(index);
			continue;
		}

		const previousIndex = run[run.length - 1];
		const previous =
			previousIndex === undefined ? undefined : messages[previousIndex];
		const previousSystem = previous?.system;
		if (
			previous &&
			previousSystem?.type === "call_started" &&
			previousSystem.byId === message.system.byId &&
			message.createdAt - previous.createdAt < windowMs
		) {
			run.push(index);
			continue;
		}

		flush();
		run.push(index);
	}
	flush();

	if (hide.size === 0) {
		return messages.slice();
	}
	return messages.filter((_, index) => !hide.has(index));
}
