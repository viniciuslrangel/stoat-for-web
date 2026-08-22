import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Textarea } from "./textarea";

describe("Textarea", () => {
	it("renders a textbox", () => {
		render(<Textarea aria-label="Bio" defaultValue="Hello" />);
		expect(screen.getByRole("textbox", { name: "Bio" })).toHaveValue("Hello");
	});

	it("is disabled when disabled", () => {
		render(<Textarea aria-label="Bio" disabled />);
		expect(screen.getByRole("textbox", { name: "Bio" })).toBeDisabled();
	});
});
