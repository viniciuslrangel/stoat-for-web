import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Input } from "./input";

describe("Input", () => {
	it("renders a textbox", () => {
		render(<Input aria-label="Email" placeholder="you@x.com" />);
		expect(screen.getByRole("textbox", { name: "Email" })).toBeVisible();
	});

	it("is disabled when disabled", () => {
		render(<Input aria-label="Email" disabled />);
		expect(screen.getByRole("textbox", { name: "Email" })).toBeDisabled();
	});
});
