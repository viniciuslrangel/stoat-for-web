import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { describe, expect, it } from "vite-plus/test";
import { Toaster } from "./sonner";

function renderToaster() {
	return render(
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
			<Toaster />
		</ThemeProvider>,
	);
}

describe("Toaster", () => {
	it("shows a toast", async () => {
		renderToaster();
		toast("Saved");
		expect(await screen.findByText("Saved")).toBeVisible();
	});

	it("shows an error toast", async () => {
		renderToaster();
		toast.error("Failed");
		expect(await screen.findByText("Failed")).toBeVisible();
	});
});
