import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { DeclineLink } from "@/components/invite/DeclineLink";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/user";
import { type BotPreview, useAddBot } from "@/hooks/useAddBot";
import { cn } from "@/lib/utils";

export function AddBotCard({ code }: { code: string }) {
	const navigate = useNavigate();
	const { view, add } = useAddBot(code);
	const [selectedId, setSelectedId] = useState("");

	if (view.status === "loading") {
		return (
			<Card size="sm" className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<Skeleton className="size-16 rounded-full" />
					<h1 className="text-xl font-semibold">Add bot</h1>
					<CardDescription>Loading this bot…</CardDescription>
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

	const { bot, action } = view;
	const destinations = action.kind === "add" ? action.destinations : [];
	const selected = destinations.find((item) => item.id === selectedId);

	async function onAdd() {
		if (!selected) {
			return;
		}
		const destination = await add(selected);
		if (!destination) {
			return;
		}
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

	return (
		<Card size="sm" className="w-full max-w-sm">
			<CardHeader className="items-center text-center">
				<BotAvatar bot={bot} />
				<h1 className="text-xl font-semibold">{bot.name}</h1>
				<CardDescription>Add this bot to a server or group.</CardDescription>
				{bot.description ? (
					<p className="line-clamp-3 text-sm text-muted-foreground">
						{bot.description}
					</p>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{action.kind === "login" ? (
					<Link to="/login/auth" className={cn(buttonVariants(), "w-full")}>
						Log in
					</Link>
				) : (
					<>
						{destinations.length > 0 ? (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="bot-destination">Add to</Label>
								<select
									id="bot-destination"
									className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
									value={selectedId}
									disabled={action.pending}
									onChange={(event) => setSelectedId(event.currentTarget.value)}
								>
									<option value="">Select a server</option>
									{destinations.map((destination) => (
										<option key={destination.id} value={destination.id}>
											{destination.kind === "group"
												? `Group · ${destination.name}`
												: destination.name}
										</option>
									))}
								</select>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								You don't have a server or group that can add this bot.
							</p>
						)}
						{action.error ? (
							<p className="text-sm text-destructive" role="alert">
								{action.error}
							</p>
						) : null}
						<Button
							className="w-full"
							disabled={action.pending || !selected}
							onClick={() => void onAdd()}
						>
							{action.pending ? (
								<>
									<Loader2 className="animate-spin" />
									Adding
								</>
							) : (
								"Add"
							)}
						</Button>
					</>
				)}
				<p className="text-xs text-muted-foreground">
					Bots are not verified by Stoat. The bot will not be granted any
					permissions.
				</p>
				<DeclineLink signedIn={action.kind !== "login"} />
			</CardContent>
		</Card>
	);
}

function BotAvatar({ bot }: { bot: BotPreview }) {
	return (
		<EntityAvatar
			name={bot.name}
			src={bot.avatarUrl}
			size="xl"
			fallbackClassName="bg-muted text-muted-foreground"
		/>
	);
}
