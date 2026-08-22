import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

describe("Dialog", () => {
	it("shows title and description when open", () => {
		render(
			<Dialog defaultOpen>
				<DialogContent>
					<DialogTitle>Invite</DialogTitle>
					<DialogDescription>Share this link</DialogDescription>
				</DialogContent>
			</Dialog>,
		);
		expect(screen.getByRole("dialog")).toBeVisible();
		expect(screen.getByText("Invite")).toBeVisible();
		expect(screen.getByText("Share this link")).toBeVisible();
	});

	it("stays closed until opened", () => {
		render(
			<Dialog>
				<DialogTrigger>Open</DialogTrigger>
				<DialogContent>
					<DialogTitle>Invite</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
	});
});
