import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";

import type { MessageSnapshot } from "@/hooks/chat-snapshots";

export function useStickToLatestMessage(
	virtualizer: Virtualizer<HTMLDivElement, Element>,
	count: number,
): void {
	useEffect(() => {
		if (count === 0) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			const element = virtualizer.scrollElement;
			if (!element) {
				return;
			}
			const total = virtualizer.getTotalSize();
			// Short histories: keep scrollTop at 0 so every row stays in range.
			// scrollToIndex(align end) on a short list can jump past totalSize and
			// leave getVirtualItems() empty (blank message pane).
			if (total <= element.clientHeight) {
				element.scrollTop = 0;
				return;
			}
			virtualizer.scrollToIndex(count - 1, { align: "end" });
		});
		return () => cancelAnimationFrame(frame);
	}, [count, virtualizer]);
}

export function useScrollToHighlightedMessage(
	virtualizer: Virtualizer<HTMLDivElement, Element>,
	messages: readonly MessageSnapshot[],
	messageId: string | undefined,
): void {
	useEffect(() => {
		if (!messageId) {
			return;
		}
		const index = messages.findIndex((message) => message.id === messageId);
		if (index < 0) {
			return;
		}
		virtualizer.scrollToIndex(index, { align: "center" });
	}, [messageId, messages, virtualizer]);
}

export function useMessageVirtualizer(
	scrollElement: HTMLDivElement | null,
	count: number,
	getKey: (index: number) => string | number,
) {
	return useVirtualizer({
		count,
		getScrollElement: () => scrollElement,
		estimateSize: () => 64,
		overscan: 16,
		getItemKey: getKey,
		enabled: scrollElement !== null,
	});
}
