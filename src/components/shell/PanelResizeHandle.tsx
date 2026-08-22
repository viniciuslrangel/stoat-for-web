import { useRef } from "react";

import { cn } from "@/lib/utils";

type PanelResizeHandleProps = {
	/** Which edge of the sized panel this handle sits on. */
	edge: "left" | "right";
	value: number;
	min: number;
	max: number;
	onChange: (next: number) => void;
	"aria-label": string;
	testId: string;
	className?: string;
};

/**
 * Pointer-drag splitter. Dragging away from the panel grows it
 * (right-edge handle → drag right; left-edge handle → drag left).
 */
export function PanelResizeHandle({
	edge,
	value,
	min,
	max,
	onChange,
	"aria-label": ariaLabel,
	testId,
	className,
}: PanelResizeHandleProps) {
	const dragRef = useRef<{ startX: number; startValue: number } | null>(null);

	return (
		// Interactive splitter; <hr> is not an appropriate substitute.
		// biome-ignore lint/a11y/useSemanticElements: pointer-draggable separator needs a focusable div
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={ariaLabel}
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			data-testid={testId}
			tabIndex={0}
			className={cn(
				"group absolute inset-y-0 z-10 w-1.5 cursor-col-resize touch-none",
				"hover:bg-primary/35 focus-visible:bg-primary/50 focus-visible:outline-none",
				"active:bg-primary/50",
				edge === "right" ? "-right-0.5" : "-left-0.5",
				className,
			)}
			onPointerDown={(event) => {
				if (event.button !== 0) {
					return;
				}
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				dragRef.current = { startX: event.clientX, startValue: value };
			}}
			onPointerMove={(event) => {
				const drag = dragRef.current;
				if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) {
					return;
				}
				const deltaX = event.clientX - drag.startX;
				const signed = edge === "right" ? deltaX : -deltaX;
				onChange(drag.startValue + signed);
			}}
			onPointerUp={(event) => {
				if (event.currentTarget.hasPointerCapture(event.pointerId)) {
					event.currentTarget.releasePointerCapture(event.pointerId);
				}
				dragRef.current = null;
			}}
			onPointerCancel={() => {
				dragRef.current = null;
			}}
			onKeyDown={(event) => {
				const step = event.shiftKey ? 24 : 8;
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					onChange(value + (edge === "right" ? -step : step));
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					onChange(value + (edge === "right" ? step : -step));
				} else if (event.key === "Home") {
					event.preventDefault();
					onChange(min);
				} else if (event.key === "End") {
					event.preventDefault();
					onChange(max);
				}
			}}
		>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-border group-hover:bg-primary group-focus-visible:bg-primary"
			/>
		</div>
	);
}
