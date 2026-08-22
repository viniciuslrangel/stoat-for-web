import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";

describe("Popover", () => {
	it("shows content when open", () => {
		render(
			<Popover defaultOpen>
				<PopoverTrigger>Info</PopoverTrigger>
				<PopoverContent>
					<PopoverTitle>Details</PopoverTitle>
				</PopoverContent>
			</Popover>,
		);
		expect(screen.getByText("Details")).toBeInTheDocument();
	});

	it("hides content when closed", () => {
		render(
			<Popover>
				<PopoverTrigger>Info</PopoverTrigger>
				<PopoverContent>
					<PopoverTitle>Details</PopoverTitle>
				</PopoverContent>
			</Popover>,
		);
		expect(screen.queryByText("Details")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Info" })).toBeVisible();
	});
});
