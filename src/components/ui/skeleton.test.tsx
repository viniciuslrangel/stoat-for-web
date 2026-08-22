import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
	it("renders a placeholder", () => {
		render(<Skeleton data-testid="skeleton" />);
		expect(screen.getByTestId("skeleton")).toBeInTheDocument();
	});

	it("forwards className", () => {
		render(<Skeleton data-testid="skeleton" className="h-4 w-24" />);
		expect(screen.getByTestId("skeleton")).toHaveClass("h-4", "w-24");
	});
});
