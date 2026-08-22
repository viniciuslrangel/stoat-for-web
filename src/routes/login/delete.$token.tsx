import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/auth/AuthShell";
import { DeleteAccountCard } from "@/components/auth/DeleteAccountCard";

export const Route = createFileRoute("/login/delete/$token")({
	component: DeleteAccountScreen,
});

function DeleteAccountScreen() {
	const { token } = Route.useParams();
	return (
		<AuthShell testId="screen-delete-account">
			<DeleteAccountCard token={token} />
		</AuthShell>
	);
}
