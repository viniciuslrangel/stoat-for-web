import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Avatar, AvatarFallback } from "./avatar";

describe("Avatar", () => {
	it("renders a fallback", () => {
		render(
			<Avatar>
				<AvatarFallback>VR</AvatarFallback>
			</Avatar>,
		);
		expect(screen.getByText("VR")).toBeVisible();
	});

	it("applies the lg size", () => {
		render(
			<Avatar size="lg">
				<AvatarFallback>VR</AvatarFallback>
			</Avatar>,
		);
		expect(
			screen.getByText("VR").closest("[data-slot=avatar]"),
		).toHaveAttribute("data-size", "lg");
	});
});
