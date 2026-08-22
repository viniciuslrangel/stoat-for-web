import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers";
import { getRouter } from "@/router";

import "@/styles.css";

const rootElement = document.getElementById("app");
if (!rootElement) {
	throw new Error("Missing #app root");
}

createRoot(rootElement).render(
	<StrictMode>
		<AppProviders>
			<RouterProvider router={getRouter()} />
		</AppProviders>
	</StrictMode>,
);
