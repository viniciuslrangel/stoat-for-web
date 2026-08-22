import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

if (typeof Element.prototype.getAnimations !== "function") {
	Element.prototype.getAnimations = () => [];
}

import { CreateOrJoinServerDialog } from "@/components/shell/CreateOrJoinServerDialog";

vi.mock("@/hooks/useCreateOrJoinServer", () => ({
	useJoinServer: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
		reset: vi.fn(),
	}),
	useCreateServer: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
		reset: vi.fn(),
	}),
}));

describe("CreateOrJoinServerDialog", () => {
	it("opens the join form from the chooser", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(<CreateOrJoinServerDialog open onOpenChange={onOpenChange} />);

		expect(
			screen.getByRole("heading", { name: "Create or join a server" }),
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Join" }));
		expect(
			screen.getByRole("heading", { name: "Join a server" }),
		).toBeVisible();
		expect(screen.getByLabelText("Code")).toBeVisible();
		expect(screen.getByPlaceholderText("stt.gg/wVEJDGVs")).toBeVisible();
	});

	it("opens the create form from the chooser", async () => {
		const user = userEvent.setup();
		render(<CreateOrJoinServerDialog open onOpenChange={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "Create" }));
		expect(
			screen.getByRole("heading", { name: "Create server" }),
		).toBeVisible();
		expect(screen.getByLabelText("Server name")).toBeVisible();
	});
});
