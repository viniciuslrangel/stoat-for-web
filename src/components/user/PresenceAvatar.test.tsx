import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { PresenceAvatar, UserAvatar } from "@/components/user";

describe("UserAvatar", () => {
	it("renders a presence pip when presence is set", () => {
		render(<UserAvatar name="Ada" presence="Online" src={null} />);
		const badge = screen.getByTestId("presence-badge");
		expect(badge).toHaveAttribute("data-presence", "Online");
		expect(badge).toHaveAttribute("aria-label", "Online");
	});

	it("maps Busy badge label to Do Not Disturb", () => {
		render(<UserAvatar name="Ada" presence="Busy" />);
		expect(screen.getByTestId("presence-badge")).toHaveAttribute(
			"aria-label",
			"Do Not Disturb",
		);
	});

	it("skips the pip when presence is omitted", () => {
		const { container } = render(
			<UserAvatar name="Vinic" src="https://cdn.test/v.png" />,
		);
		expect(screen.queryByTestId("presence-badge")).toBeNull();
		const image = container.querySelector('[data-slot="avatar-image"]');
		if (image) {
			expect(image).toHaveAttribute("src", "https://cdn.test/v.png");
		} else {
			expect(container.textContent).toContain("VI");
		}
	});

	it("honors showPresence=false even with a status", () => {
		render(<UserAvatar name="Ada" presence="Idle" showPresence={false} />);
		expect(screen.queryByTestId("presence-badge")).toBeNull();
	});

	it("PresenceAvatar alias still works", () => {
		render(<PresenceAvatar name="Ada" presence="Online" />);
		expect(screen.getByTestId("presence-badge")).toBeInTheDocument();
	});

	it("uses sidebar cutout border for member-list pips", () => {
		render(<UserAvatar name="Ada" presence="Online" surface="sidebar" />);
		expect(screen.getByTestId("presence-badge").className).toContain(
			"border-sidebar",
		);
	});
});
