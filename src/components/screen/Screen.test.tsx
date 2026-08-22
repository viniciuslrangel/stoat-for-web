import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { Screen } from "./Screen";

describe("Screen", () => {
	it("exposes a visible screen-${id} test id", () => {
		render(<Screen id="home" title="Home" />);
		expect(screen.getByTestId("screen-home")).toBeVisible();
		expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
	});

	it("uses the screen id in the test id", () => {
		render(<Screen id="login" title="Log in" />);
		expect(screen.getByTestId("screen-login")).toBeVisible();
	});
});
