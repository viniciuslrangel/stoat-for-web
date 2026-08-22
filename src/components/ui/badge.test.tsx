import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Badge } from "./badge";

describe("Badge", () => {
	it("renders its label", () => {
		render(<Badge>New</Badge>);
		expect(screen.getByText("New")).toBeVisible();
	});

	it("applies the destructive variant", () => {
		render(<Badge variant="destructive">Alert</Badge>);
		const badge = screen.getByText("Alert");
		expect(badge).toBeVisible();
		expect(badge.className).toContain("text-destructive");
	});
});
