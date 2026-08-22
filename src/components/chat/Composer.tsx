import { type FormEvent, type KeyboardEvent, useState } from "react";

import { buildSendPayload } from "@/hooks/chat-snapshots";
import { cn } from "@/lib/utils";

export function Composer({
	placeholder,
	disabled,
	onSend,
}: {
	placeholder: string;
	disabled: boolean;
	onSend: (content: string) => Promise<void>;
}) {
	const [value, setValue] = useState("");

	async function submit(): Promise<void> {
		const payload = buildSendPayload(value);
		if (!payload || disabled) {
			return;
		}
		try {
			await onSend(payload.content);
			setValue("");
		} catch {
			return;
		}
	}

	function onSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void submit();
	}

	function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
		if (event.key !== "Enter" || event.shiftKey) {
			return;
		}
		event.preventDefault();
		void submit();
	}

	return (
		<form
			onSubmit={onSubmit}
			className="shrink-0 px-4 pb-6"
			data-testid="message-composer-form"
		>
			<label className="sr-only" htmlFor="message-composer">
				Message
			</label>
			<textarea
				id="message-composer"
				data-testid="message-composer"
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				rows={1}
				onChange={(event) => {
					setValue(event.target.value);
				}}
				onKeyDown={onKeyDown}
				className={cn(
					"max-h-40 min-h-11 w-full resize-none rounded-lg border-[3px] border-border bg-input px-4 py-2.5 text-sm font-medium text-foreground nb-shadow",
					"placeholder:text-muted-foreground outline-none",
					"focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
					"disabled:opacity-60",
				)}
			/>
		</form>
	);
}
