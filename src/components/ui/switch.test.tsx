import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Switch } from "./switch";

describe("Switch", () => {
	it("renders an unchecked switch", () => {
		render(<Switch aria-label="Mute" />);
		expect(screen.getByRole("switch", { name: "Mute" })).not.toBeChecked();
	});

	it("renders checked when defaultChecked", () => {
		render(<Switch aria-label="Mute" defaultChecked />);
		expect(screen.getByRole("switch", { name: "Mute" })).toBeChecked();
	});
});
