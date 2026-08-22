import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/login/reset")({
	component: LoginResetLayout,
});

function LoginResetLayout() {
	return <Outlet />;
}
