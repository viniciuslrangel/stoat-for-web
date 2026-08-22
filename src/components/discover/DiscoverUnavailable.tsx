import { Link } from "@tanstack/react-router";
import { Compass, House, Users } from "lucide-react";

import {
	DestinationLanding,
	LandingActionBody,
	landingActionClassName,
} from "@/components/shell/DestinationLanding";

export function DiscoverUnavailable({ loading }: { loading: boolean }) {
	return (
		<DestinationLanding
			testId="screen-discover"
			header={
				<>
					<Compass className="size-5 text-foreground" />
					Discover
				</>
			}
			loading={loading}
			title="Discover isn't available here"
			description="This instance does not list public servers. Join with an invite, or go back to Home or Friends."
			actions={
				<>
					<Link to="/app" className={landingActionClassName}>
						<LandingActionBody
							icon={<House className="size-5 shrink-0" />}
							title="Home"
							description="Back to conversations and servers."
						/>
					</Link>
					<Link to="/friends" className={landingActionClassName}>
						<LandingActionBody
							icon={<Users className="size-5 shrink-0" />}
							title="Friends"
							description="See who is online and add people."
						/>
					</Link>
				</>
			}
		/>
	);
}
