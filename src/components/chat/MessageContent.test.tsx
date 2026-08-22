import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { MessageContent } from "@/components/chat/MessageContent";

const USER = "01M0DJ5Q6KX1BAJTTGKXHNPGV7";

describe("MessageContent", () => {
	it("renders a user mention chip with display name", () => {
		const usersById = new Map([[USER, "ViniciusRangel"]]);
		render(
			<MessageContent content={`hello <@${USER}>`} usersById={usersById} />,
		);
		const chip = screen.getByTestId("mention-user");
		expect(chip.textContent).toBe("@ViniciusRangel");
		expect(chip.getAttribute("title")).toBe(USER);
		expect(screen.queryByText(`<@${USER}>`)).toBeNull();
	});

	it("renders unknown user chips without raw syntax", () => {
		render(<MessageContent content={`ping <@${USER}>`} />);
		const chip = screen.getByTestId("mention-user");
		expect(chip.textContent).toBe("@Unknown user");
		expect(screen.queryByText(`<@${USER}>`)).toBeNull();
	});

	it("preserves newlines in surrounding text", () => {
		const { container } = render(
			<MessageContent content={`a\n<@${USER}>\nb`} />,
		);
		expect(container.textContent).toBe("a\n@Unknown user\nb");
	});

	it("renders safe external links", () => {
		render(<MessageContent content="go https://example.com/docs" />);
		const link = screen.getByTestId("message-link");
		expect(link.getAttribute("href")).toBe("https://example.com/docs");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("renders a code fence as a distinct block", () => {
		render(<MessageContent content={"```ts\nconst n = 1;\n```"} />);
		const block = screen.getByTestId("message-code-block");
		expect(block.getAttribute("data-language")).toBe("ts");
		expect(screen.getByTestId("message-code-language").textContent).toBe("ts");
		expect(block.textContent).toContain("const n = 1;");
	});

	it("embeds image urls from content", () => {
		const src = "https://cdn.example.com/photo.webp";
		render(<MessageContent content={src} />);
		const img = screen.getByTestId("message-content-image");
		expect(img.getAttribute("src")).toBe(src);
	});

	it("embeds autumn attachment images", () => {
		render(
			<MessageContent
				content=""
				attachments={[
					{
						id: "01FILE",
						url: "https://autumn.test/attachments/01FILE",
						filename: "shot.png",
						contentType: "image/png",
						kind: "image",
					},
				]}
			/>,
		);
		const img = screen.getByTestId("message-attachment-image");
		expect(img.getAttribute("src")).toBe(
			"https://autumn.test/attachments/01FILE",
		);
		expect(img.getAttribute("alt")).toBe("shot.png");
	});

	it("keeps mention chips when mixed with links and fences", () => {
		const usersById = new Map([[USER, "Ada"]]);
		render(
			<MessageContent
				content={`hi <@${USER}> https://example.com\n\`\`\`\nx\n\`\`\``}
				usersById={usersById}
			/>,
		);
		expect(screen.getByTestId("mention-user").textContent).toBe("@Ada");
		expect(screen.getByTestId("message-link")).toBeTruthy();
		expect(screen.getByTestId("message-code-block").textContent).toContain("x");
	});
});
