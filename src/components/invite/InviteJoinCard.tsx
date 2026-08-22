import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { DeclineLink } from "@/components/invite/DeclineLink";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/user";
import {
	type InviteDestination,
	type InvitePreview,
	useInvite,
} from "@/hooks/useInvite";
import { cn } from "@/lib/utils";

export function InviteJoinCard({ code }: { code: string }) {
	const navigate = useNavigate();
	const { view, accept } = useInvite(code);

	async function onAccept() {
		const destination = await accept();
		if (destination) {
			await goToDestination(navigate, destination);
		}
	}

	if (view.status === "loading") {
		return (
			<Card size="sm" className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<Skeleton className="size-16 rounded-full" />
					<h1 className="text-xl font-semibold">Invite</h1>
					<CardDescription>Loading this invite…</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (view.status === "error") {
		return (
			<Card size="sm" className="w-full max-w-sm">
				<CardHeader className="text-center">
					<h1 className="text-xl font-semibold">{view.heading}</h1>
					<CardDescription>{view.message}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					<Link to="/login/auth" className={cn(buttonVariants(), "w-full")}>
						Log in
					</Link>
					<Link
						to="/login"
						className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
					>
						Decline
					</Link>
				</CardContent>
			</Card>
		);
	}

	const { invite, action } = view;
	return (
		<Card size="sm" className="w-full max-w-sm">
			{invite.bannerUrl ? (
				<img
					src={invite.bannerUrl}
					alt=""
					className="h-24 w-full object-cover"
				/>
			) : null}
			<CardHeader className="items-center text-center">
				<InviteAvatar invite={invite} />
				<h1 className="text-xl font-semibold">{invite.name}</h1>
				<CardDescription>{inviteDescription(invite)}</CardDescription>
				{invite.memberCount !== null ? (
					<p className="text-sm text-muted-foreground">
						{memberCountLabel(invite.memberCount)}
					</p>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{action.kind === "login" ? (
					<Link to="/login/auth" className={cn(buttonVariants(), "w-full")}>
						Log in
					</Link>
				) : null}
				{action.kind === "open" ? (
					<DestinationLink destination={invite.destination} label="Open" />
				) : null}
				{action.kind === "join" ? (
					<>
						{action.error ? (
							<p className="text-sm text-destructive" role="alert">
								{action.error}
							</p>
						) : null}
						<Button
							className="w-full"
							disabled={action.pending}
							onClick={() => void onAccept()}
						>
							{action.pending ? (
								<>
									<Loader2 className="animate-spin" />
									Joining
								</>
							) : (
								"Accept invite"
							)}
						</Button>
					</>
				) : null}
				<DeclineLink signedIn={action.kind !== "login"} />
			</CardContent>
		</Card>
	);
}

function InviteAvatar({ invite }: { invite: InvitePreview }) {
	return (
		<EntityAvatar
			name={invite.name}
			src={invite.iconUrl}
			size="xl"
			fallbackClassName="bg-muted text-muted-foreground"
		/>
	);
}

function inviteDescription(invite: InvitePreview): string {
	const target =
		invite.destination.kind === "server" ? "this server" : "this group";
	if (invite.alreadyMember) {
		return `You're already part of ${target}.`;
	}
	if (invite.inviterName) {
		return `${invite.inviterName} invited you to join ${target}.`;
	}
	return `You've been invited to join ${target}.`;
}

function memberCountLabel(count: number): string {
	return count === 1 ? "1 member" : `${count} members`;
}

function DestinationLink({
	destination,
	label,
}: {
	destination: InviteDestination;
	label: string;
}) {
	if (destination.kind === "server") {
		return (
			<Link
				to="/server/$serverId"
				params={{ serverId: destination.id }}
				className={cn(buttonVariants(), "w-full")}
			>
				{label}
			</Link>
		);
	}
	return (
		<Link
			to="/channel/$channelId"
			params={{ channelId: destination.id }}
			className={cn(buttonVariants(), "w-full")}
		>
			{label}
		</Link>
	);
}

async function goToDestination(
	navigate: ReturnType<typeof useNavigate>,
	destination: InviteDestination,
): Promise<void> {
	if (destination.kind === "server") {
		await navigate({
			to: "/server/$serverId",
			params: { serverId: destination.id },
		});
		return;
	}
	await navigate({
		to: "/channel/$channelId",
		params: { channelId: destination.id },
	});
}
