import { useAtom } from "jotai";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
	THEME_CHOICES,
	USER_SETTINGS_GROUPS,
	type UserSettingsPageId,
} from "@/components/settings/userSettingsPages";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user";
import type { MeSnapshot } from "@/hooks/shell-snapshots";
import { useLogout } from "@/hooks/useLogout";
import { useSettingsOverlay } from "@/hooks/useSettingsOverlay";
import { cn } from "@/lib/utils";
import { settingsPageAtom } from "@/state/prefs";

export function SettingsOverlay({
	loading,
	me,
}: {
	loading: boolean;
	me: MeSnapshot | null;
}) {
	const { close } = useSettingsOverlay();
	const [page, setPage] = useAtom(settingsPageAtom);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
			data-testid="screen-settings"
			className="dark flex h-svh overflow-hidden sidebar-surface text-foreground"
		>
			<h1 id="settings-title" className="sr-only">
				Settings
			</h1>
			<nav
				aria-label="Settings categories"
				data-testid="settings-categories"
				className="flex w-[232px] shrink-0 justify-end overflow-y-auto border-r-[3px] border-border py-16 pr-2 pl-4"
			>
				<div className="flex w-[200px] flex-col gap-6">
					{USER_SETTINGS_GROUPS.map((group) => (
						<section key={group.id} className="flex flex-col gap-1">
							<h2 className="px-2.5 pb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
								{group.title}
							</h2>
							{group.pages.map((entry) => {
								const selected = page === entry.id;
								return (
									<button
										key={entry.id}
										type="button"
										aria-current={selected ? "page" : undefined}
										className={cn(
											"rounded-md border-[3px] px-2.5 py-1.5 text-left text-base",
											selected
												? "border-border active-surface font-semibold text-foreground"
												: "border-transparent text-muted-foreground hover:border-border hover:bg-sidebar-accent hover:text-foreground",
										)}
										onClick={() => setPage(entry.id)}
									>
										{entry.label}
									</button>
								);
							})}
						</section>
					))}
				</div>
			</nav>
			<div className="flex min-w-0 flex-1 app-canvas">
				<div
					data-testid="settings-panel"
					className="min-w-0 flex-1 overflow-y-auto px-10 py-16"
				>
					<div className="mx-auto w-full max-w-[740px]">
						<SettingsPanel loading={loading} me={me} page={page} />
					</div>
				</div>
				<div className="flex w-16 shrink-0 flex-col items-center pt-16">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Close settings"
						className="size-9"
						onClick={close}
					>
						<X className="size-5" />
					</Button>
					<span className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground">
						ESC
					</span>
				</div>
			</div>
		</div>
	);
}

function SettingsPanel({
	page,
	loading,
	me,
}: {
	page: UserSettingsPageId;
	loading: boolean;
	me: MeSnapshot | null;
}) {
	switch (page) {
		case "account":
			return <AccountPanel loading={loading} me={me} />;
		case "appearance":
			return <AppearancePanel />;
		case "voice":
			return <VoicePanel />;
	}
}

function AccountPanel({
	loading,
	me,
}: {
	loading: boolean;
	me: MeSnapshot | null;
}) {
	const { logout, status } = useLogout();
	const [logoutOpen, setLogoutOpen] = useState(false);
	const logoutPending = status.kind === "pending";

	function handleLogoutOpenChange(open: boolean): void {
		if (!logoutPending) {
			setLogoutOpen(open);
		}
	}

	async function confirmLogout(): Promise<void> {
		if (logoutPending) {
			return;
		}
		await logout();
		setLogoutOpen(false);
	}

	if (loading || !me) {
		return (
			<section>
				<h2 className="mb-6 text-xl font-bold tracking-tight">My Account</h2>
				{loading ? (
					<div className="flex items-center gap-4 rounded-md border-[3px] border-border surface-ink p-4 nb-shadow">
						<Skeleton className="size-16 rounded-full border-[3px] border-border bg-muted" />
						<div className="flex flex-1 flex-col gap-2">
							<Skeleton className="h-5 w-40 rounded-md bg-muted" />
							<Skeleton className="h-4 w-28 rounded-md bg-muted" />
						</div>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Account details aren't available.
					</p>
				)}
			</section>
		);
	}

	return (
		<section>
			<h2 className="mb-6 text-xl font-bold tracking-tight">My Account</h2>
			<div className="flex items-center gap-4 rounded-md border-[3px] border-border surface-ink p-4 nb-shadow">
				<UserAvatar
					name={me.displayName}
					src={me.avatarUrl}
					presence={me.presence}
					size="xl"
					surface="ink"
				/>
				<div className="min-w-0">
					<p className="truncate text-base font-bold tracking-tight">
						{me.displayName}
					</p>
					<p className="truncate text-sm text-muted-foreground">
						{me.username}
					</p>
				</div>
			</div>
			<div className="mt-10 border-t-[3px] border-border pt-8">
				<h3 className="text-base font-bold tracking-tight">Account actions</h3>
				<p className="mt-2 mb-4 text-sm text-muted-foreground">
					Sign out of this Stoat account on this device.
				</p>
				<Button
					type="button"
					variant="destructive"
					data-testid="open-logout"
					onClick={() => setLogoutOpen(true)}
				>
					Log out
				</Button>
			</div>
			<Dialog open={logoutOpen} onOpenChange={handleLogoutOpenChange}>
				<DialogContent className="dark bg-background text-foreground">
					<DialogHeader>
						<DialogTitle>Log out of Stoat?</DialogTitle>
						<DialogDescription>
							You will need to sign in again to use this account.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="bg-transparent">
						<Button
							type="button"
							variant="outline"
							disabled={logoutPending}
							onClick={() => setLogoutOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={logoutPending}
							onClick={() => void confirmLogout()}
						>
							{logoutPending ? "Logging out…" : "Log out"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function AppearancePanel() {
	const { theme, setTheme } = useTheme();
	const selected = theme ?? "system";

	return (
		<section>
			<h2 className="mb-6 text-xl font-bold tracking-tight">Appearance</h2>
			<fieldset className="border-0 p-0">
				<legend className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
					Theme
				</legend>
				<div className="flex flex-wrap gap-4">
					{THEME_CHOICES.map((choice) => {
						const checked = selected === choice.id;
						return (
							<label
								key={choice.id}
								className={cn(
									"w-[108px] cursor-pointer rounded-md border-[3px] p-1 text-left nb-shadow",
									checked
										? "border-primary"
										: "border-border hover:border-foreground/40",
								)}
							>
								<input
									type="radio"
									name="theme"
									value={choice.id}
									checked={checked}
									className="sr-only"
									onChange={() => setTheme(choice.id)}
								/>
								<span
									className={cn(
										"mb-2 block h-16 overflow-hidden rounded-md border border-border",
										choice.id === "light" && "bg-[#f4f2ee]",
										choice.id === "dark" && "bg-ink",
										choice.id === "system" &&
											"bg-[linear-gradient(90deg,#f4f2ee_50%,#0f0f12_50%)]",
									)}
								/>
								<span className="block px-1 pb-1 text-sm font-semibold text-foreground">
									{choice.label}
								</span>
							</label>
						);
					})}
				</div>
			</fieldset>
		</section>
	);
}

function VoicePanel() {
	return (
		<section>
			<h2 className="mb-6 text-xl font-bold tracking-tight">Voice</h2>
			<p className="mb-3 text-sm text-muted-foreground">
				Join a voice-capable channel from the server sidebar. Mute, deafen, and
				End Call live on the call pane.
			</p>
			<p className="text-sm text-muted-foreground">
				Noise suppression defaults to RNNoise (enhanced). Device pickers and
				per-user volumes land with the full voice settings port.
			</p>
		</section>
	);
}
