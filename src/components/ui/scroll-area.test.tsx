import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { ScrollArea } from "./scroll-area";

describe("ScrollArea", () => {
	it("renders its children", () => {
		render(
			<ScrollArea>
				<p>Long content</p>
			</ScrollArea>,
		);
		expect(screen.getByText("Long content")).toBeVisible();
	});

	it("forwards className to the root", () => {
		const { container } = render(
			<ScrollArea className="h-20">
				<p>Long content</p>
			</ScrollArea>,
		);
		expect(container.querySelector("[data-slot=scroll-area]")).toHaveClass(
			"h-20",
		);
	});
});
