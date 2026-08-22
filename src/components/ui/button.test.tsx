import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Button } from "./button";

describe("Button", () => {
	it("renders its label", () => {
		render(<Button>Save</Button>);
		expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
	});

	it("is disabled when disabled", () => {
		render(<Button disabled>Save</Button>);
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
	});
});
