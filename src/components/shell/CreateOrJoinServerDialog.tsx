import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateServer, useJoinServer } from "@/hooks/useCreateOrJoinServer";

export type CreateOrJoinStep = "chooser" | "join" | "create";

export function CreateOrJoinServerDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [step, setStep] = useState<CreateOrJoinStep>("chooser");
	const [invite, setInvite] = useState("");
	const [serverName, setServerName] = useState("");
	const join = useJoinServer();
	const create = useCreateServer();

	function handleOpenChange(next: boolean) {
		onOpenChange(next);
		if (!next) {
			setStep("chooser");
			setInvite("");
			setServerName("");
			join.reset();
			create.reset();
		}
	}

	async function handleJoin(event: FormEvent) {
		event.preventDefault();
		try {
			await join.mutateAsync(invite);
			handleOpenChange(false);
		} catch {
			/* toast from mutation */
		}
	}

	async function handleCreate(event: FormEvent) {
		event.preventDefault();
		try {
			await create.mutateAsync(serverName);
			handleOpenChange(false);
		} catch {
			/* toast from mutation */
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				data-testid="create-or-join-server-dialog"
				className="dark bg-background text-foreground sm:max-w-md"
			>
				{step === "chooser" ? (
					<>
						<DialogHeader>
							<DialogTitle>Create or join a server</DialogTitle>
							<DialogDescription>
								Would you like to create a new server or join an existing one?
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="bg-transparent sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep("create")}
							>
								Create
							</Button>
							<Button
								type="button"
								className="bg-success text-primary-foreground hover:bg-success/90"
								onClick={() => setStep("join")}
							>
								Join
							</Button>
						</DialogFooter>
					</>
				) : null}

				{step === "join" ? (
					<form onSubmit={(event) => void handleJoin(event)}>
						<DialogHeader>
							<DialogTitle>Join a server</DialogTitle>
							<DialogDescription>Use a code or invite link</DialogDescription>
						</DialogHeader>
						<div className="grid gap-2 py-2">
							<Label htmlFor="join-server-invite">Code</Label>
							<Input
								id="join-server-invite"
								value={invite}
								onChange={(event) => setInvite(event.target.value)}
								placeholder="stt.gg/wVEJDGVs"
								autoComplete="off"
								autoFocus
							/>
						</div>
						<DialogFooter className="bg-transparent">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep("chooser")}
								disabled={join.isPending}
							>
								Back
							</Button>
							<Button
								type="submit"
								disabled={join.isPending || invite.trim().length === 0}
								className="bg-success text-primary-foreground hover:bg-success/90"
							>
								{join.isPending ? "Joining…" : "Join"}
							</Button>
						</DialogFooter>
					</form>
				) : null}

				{step === "create" ? (
					<form onSubmit={(event) => void handleCreate(event)}>
						<DialogHeader>
							<DialogTitle>Create server</DialogTitle>
							<DialogDescription>
								By creating this server, you agree to the{" "}
								<a
									href="https://stoat.chat/aup"
									target="_blank"
									rel="noreferrer"
								>
									Acceptable Use Policy
								</a>
								.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-2 py-2">
							<Label htmlFor="create-server-name">Server name</Label>
							<Input
								id="create-server-name"
								value={serverName}
								onChange={(event) => setServerName(event.target.value)}
								maxLength={32}
								autoComplete="off"
								autoFocus
							/>
						</div>
						<DialogFooter className="bg-transparent">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep("chooser")}
								disabled={create.isPending}
							>
								Back
							</Button>
							<Button
								type="submit"
								disabled={create.isPending || serverName.trim().length === 0}
								className="bg-success text-primary-foreground hover:bg-success/90"
							>
								{create.isPending ? "Creating…" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
