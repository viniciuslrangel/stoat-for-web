import { createFileRoute } from "@tanstack/react-router";

import { AuthShell } from "@/components/auth/AuthShell";
import { AddBotCard } from "@/components/bot/AddBotCard";
import { useSignedInGate } from "@/hooks/useSignedInGate";

export const Route = createFileRoute("/bot/$code")({
	component: AddBotScreen,
});

function AddBotScreen() {
	const { code } = Route.useParams();
	useSignedInGate();
	return (
		<AuthShell testId="screen-add-bot">
			<AddBotCard code={code} />
		</AuthShell>
	);
}
