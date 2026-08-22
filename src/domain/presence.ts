export type Presence = "Online" | "Idle" | "Focus" | "Busy" | "Invisible";

export function parsePresence(value: unknown, online: boolean): Presence {
	if (!online) {
		return "Invisible";
	}
	if (
		value === "Online" ||
		value === "Idle" ||
		value === "Focus" ||
		value === "Busy" ||
		value === "Invisible"
	) {
		return value;
	}
	return "Online";
}

export function presenceLabel(presence: Presence): string {
	switch (presence) {
		case "Online":
			return "Online";
		case "Idle":
			return "Idle";
		case "Focus":
			return "Focus";
		case "Busy":
			return "Do Not Disturb";
		case "Invisible":
			return "Offline";
		default: {
			const _exhaustive: never = presence;
			return _exhaustive;
		}
	}
}

export const PRESENCE_DOT_CLASS: Record<Presence, string> = {
	Online: "bg-[#23a55a]",
	Idle: "bg-[#f0b232]",
	Focus: "bg-[#3e70dd]",
	Busy: "bg-[#f23f43]",
	Invisible: "bg-[#80848e]",
};

export function presenceBadgeClass(presence: Presence): string {
	return PRESENCE_DOT_CLASS[presence];
}
