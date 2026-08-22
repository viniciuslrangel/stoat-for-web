import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/login/create")({
	component: LoginCreateLayout,
});

function LoginCreateLayout() {
	return <Outlet />;
}
