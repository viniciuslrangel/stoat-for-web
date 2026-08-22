import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

describe("Tooltip", () => {
	it("shows content when open", () => {
		render(
			<TooltipProvider>
				<Tooltip defaultOpen>
					<TooltipTrigger>Hint</TooltipTrigger>
					<TooltipContent>Details</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		expect(screen.getByText("Details")).toBeInTheDocument();
	});

	it("hides content when closed", () => {
		render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger>Hint</TooltipTrigger>
					<TooltipContent>Details</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		expect(screen.getByText("Hint")).toBeVisible();
	});
});
