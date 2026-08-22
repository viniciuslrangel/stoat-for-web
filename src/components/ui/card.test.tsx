import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";

describe("Card", () => {
	it("renders title and content", () => {
		render(
			<Card>
				<CardHeader>
					<CardTitle>Servers</CardTitle>
					<CardDescription>Your communities</CardDescription>
				</CardHeader>
				<CardContent>General</CardContent>
			</Card>,
		);
		expect(screen.getByText("Servers")).toBeVisible();
		expect(screen.getByText("General")).toBeVisible();
	});

	it("applies the sm size", () => {
		render(
			<Card size="sm">
				<CardTitle>Servers</CardTitle>
			</Card>,
		);
		expect(
			screen.getByText("Servers").closest("[data-slot=card]"),
		).toHaveAttribute("data-size", "sm");
	});
});
