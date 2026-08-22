import { Link } from "@tanstack/react-router";
import { HeartHandshake, Plus, Settings, Users } from "lucide-react";

import {
	DestinationLanding,
	LandingActionBody,
	landingActionClassName,
} from "@/components/shell/DestinationLanding";
import { Button } from "@/components/ui/button";

export function HomeDashboard({ loading }: { loading: boolean }) {
	return (
		<DestinationLanding
			testId="screen-home"
			header="Home"
			loading={loading}
			title="Home"
			description="Jump into friends, settings, or a new server."
			actions={
				<>
					<Link to="/friends" className={landingActionClassName}>
						<LandingActionBody
							icon={<Users className="size-5 shrink-0" />}
							title="Friends"
							description="See who is online and add people."
						/>
					</Link>
					<Link to="/settings" className={landingActionClassName}>
						<LandingActionBody
							icon={<Settings className="size-5 shrink-0" />}
							title="Open settings"
							description="Account, appearance, and voice."
						/>
					</Link>
					<Button
						type="button"
						variant="secondary"
						className="h-auto justify-start gap-3 px-4 py-3 text-left whitespace-normal"
					>
						<LandingActionBody
							icon={<Plus className="size-5 shrink-0" />}
							title="Create a group or server"
							description="Invite friends and throw a party."
						/>
					</Button>
					<a
						href="https://ko-fi.com/stoatchat"
						target="_blank"
						rel="noreferrer"
						className={landingActionClassName}
					>
						<LandingActionBody
							icon={<HeartHandshake className="size-5 shrink-0" />}
							title="Donate to Stoat"
							description="Support the project."
						/>
					</a>
				</>
			}
		/>
	);
}
