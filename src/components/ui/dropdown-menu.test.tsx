import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenu", () => {
	it("shows items when open", () => {
		render(
			<DropdownMenu defaultOpen>
				<DropdownMenuTrigger>Menu</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Profile</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		expect(
			screen.getByRole("menuitem", { name: "Profile" }),
		).toBeInTheDocument();
	});

	it("marks a disabled item", () => {
		render(
			<DropdownMenu defaultOpen>
				<DropdownMenuTrigger>Menu</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem disabled>Hidden</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		expect(screen.getByRole("menuitem", { name: "Hidden" })).toHaveAttribute(
			"data-disabled",
		);
	});
});
