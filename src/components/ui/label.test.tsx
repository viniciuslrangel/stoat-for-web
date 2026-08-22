import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Input } from "./input";
import { Label } from "./label";

describe("Label", () => {
	it("renders its text", () => {
		render(<Label>Name</Label>);
		expect(screen.getByText("Name")).toBeVisible();
	});

	it("associates with a control via htmlFor", () => {
		render(
			<>
				<Label htmlFor="name">Name</Label>
				<Input id="name" />
			</>,
		);
		expect(screen.getByLabelText("Name")).toBe(screen.getByRole("textbox"));
	});
});
