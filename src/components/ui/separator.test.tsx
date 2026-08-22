import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Separator } from "./separator";

describe("Separator", () => {
	it("renders a horizontal separator", () => {
		render(<Separator />);
		expect(screen.getByRole("separator")).toBeVisible();
	});

	it("renders a vertical separator", () => {
		render(<Separator orientation="vertical" />);
		expect(screen.getByRole("separator")).toHaveAttribute(
			"data-orientation",
			"vertical",
		);
	});
});
