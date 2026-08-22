export {
	EntityAvatar,
	type EntityAvatarProps,
	type EntityAvatarSize,
} from "@/components/user/EntityAvatar";

export {
	PresenceAvatar,
	type PresenceAvatarProps,
	UserAvatar,
	type UserAvatarProps,
	type UserAvatarSize,
	type UserAvatarSurface,
} from "@/components/user/UserAvatar";
export {
	PRESENCE_DOT_CLASS,
	type Presence,
	parsePresence,
	presenceBadgeClass,
	presenceLabel,
} from "@/domain/presence";
export {
	autumnFileUrl,
	avatarUrlFromRestFile,
	userAvatarUrlFromSdk,
	withAutumnOriginal,
} from "@/lib/avatar-url";
export { displayInitials } from "@/lib/display-initials";
