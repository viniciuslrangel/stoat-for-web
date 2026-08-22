import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
	it("renders an unchecked checkbox", () => {
		render(<Checkbox aria-label="Accept" />);
		expect(screen.getByRole("checkbox", { name: "Accept" })).not.toBeChecked();
	});

	it("renders checked when defaultChecked", () => {
		render(<Checkbox aria-label="Accept" defaultChecked />);
		expect(screen.getByRole("checkbox", { name: "Accept" })).toBeChecked();
	});
});
