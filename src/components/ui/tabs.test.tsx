import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
	it("shows the selected panel", () => {
		render(
			<Tabs defaultValue="one">
				<TabsList>
					<TabsTrigger value="one">One</TabsTrigger>
					<TabsTrigger value="two">Two</TabsTrigger>
				</TabsList>
				<TabsContent value="one">Panel one</TabsContent>
				<TabsContent value="two">Panel two</TabsContent>
			</Tabs>,
		);
		expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByText("Panel one")).toBeVisible();
	});

	it("disables a tab", () => {
		render(
			<Tabs defaultValue="one">
				<TabsList>
					<TabsTrigger value="one">One</TabsTrigger>
					<TabsTrigger value="two" disabled>
						Two
					</TabsTrigger>
				</TabsList>
				<TabsContent value="one">Panel one</TabsContent>
			</Tabs>,
		);
		expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
			"data-disabled",
		);
	});
});
