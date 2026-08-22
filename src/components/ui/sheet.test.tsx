import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";

describe("Sheet", () => {
	it("shows its title when open", () => {
		render(
			<Sheet defaultOpen>
				<SheetContent>
					<SheetTitle>Navigation</SheetTitle>
				</SheetContent>
			</Sheet>,
		);
		expect(screen.getByRole("dialog")).toBeVisible();
		expect(screen.getByText("Navigation")).toBeVisible();
	});

	it("applies a left side", () => {
		render(
			<Sheet defaultOpen>
				<SheetTrigger>Open</SheetTrigger>
				<SheetContent side="left">
					<SheetTitle>Navigation</SheetTitle>
				</SheetContent>
			</Sheet>,
		);
		expect(
			screen.getByText("Navigation").closest("[data-slot=sheet-content]"),
		).toHaveAttribute("data-side", "left");
	});
});
