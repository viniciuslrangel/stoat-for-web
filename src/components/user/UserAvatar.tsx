import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	type Presence,
	presenceBadgeClass,
	presenceLabel,
} from "@/domain/presence";
import { displayInitials } from "@/lib/display-initials";
import { cn } from "@/lib/utils";

export type UserAvatarSize = "sm" | "default" | "lg" | "xl" | "rail";

/** Panel color behind the avatar; pip cutout must match it. */
export type UserAvatarSurface =
	| "background"
	| "sidebar"
	| "raised"
	| "ink"
	| "panel";

const SIZE_CLASS: Record<UserAvatarSize, string> = {
	sm: "size-6",
	default: "size-8",
	lg: "size-10",
	xl: "size-16",
	rail: "size-[42px]",
};

const FALLBACK_TEXT: Record<UserAvatarSize, string> = {
	sm: "text-[10px]",
	default: "text-xs",
	lg: "text-sm",
	xl: "text-lg",
	rail: "text-xs",
};

const PIP_SIZE: Record<UserAvatarSize, string> = {
	sm: "size-2.5",
	default: "size-3",
	lg: "size-3.5",
	xl: "size-4",
	rail: "size-3.5",
};

/** Solid cutout around the pip (Discord-style mask), not a thin ring on the face border. */
const SURFACE_CUTOUT: Record<UserAvatarSurface, string> = {
	background: "border-[3px] border-background",
	sidebar: "border-[3px] border-sidebar",
	raised: "border-[3px] border-raised",
	ink: "border-[3px] border-ink",
	panel: "border-[3px] border-panel",
};

export type UserAvatarProps = {
	name: string;
	src?: string | null;
	/** When set (and showPresence is not false), draws the corner status pip. */
	presence?: Presence | null;
	size?: UserAvatarSize;
	/** Color behind the avatar; controls the pip cutout. */
	surface?: UserAvatarSurface;
	className?: string;
	fallbackClassName?: string;
	badgeClassName?: string;
	/** Defaults to true when presence is provided. */
	showPresence?: boolean;
	title?: string;
};

/**
 * Shared user avatar: circular face, optional Discord-like presence pip.
 * Owns border/radius/pip stacking. Call sites pass size + surface, not local
 * rounded-sm / border-[3px] overrides that fight the pip.
 * Pass snapshot fields only (url string + Presence). Never pass SDK User objects.
 */
export function UserAvatar({
	name,
	src,
	presence = null,
	size = "default",
	surface = "background",
	className,
	fallbackClassName,
	badgeClassName,
	showPresence,
	title,
}: UserAvatarProps) {
	const pip = (showPresence ?? presence != null) && presence != null;
	const label = presence ? presenceLabel(presence) : undefined;
	const avatarSize = size === "xl" || size === "rail" ? "lg" : size;

	return (
		<Avatar
			size={avatarSize}
			title={title}
			data-user-avatar-size={size}
			className={cn(
				"overflow-visible rounded-full after:rounded-full",
				// Hairline outline only when no pip; pip cutout owns the edge.
				pip ? "after:hidden" : "after:border-border",
				SIZE_CLASS[size],
				className,
			)}
		>
			{src ? <AvatarImage src={src} alt="" className="rounded-full" /> : null}
			<AvatarFallback
				className={cn(
					"rounded-full bg-primary font-bold text-primary-foreground",
					FALLBACK_TEXT[size],
					fallbackClassName,
				)}
			>
				{displayInitials(name)}
			</AvatarFallback>
			{pip ? (
				<AvatarBadge
					data-testid="presence-badge"
					data-presence={presence}
					aria-label={label}
					title={label}
					className={cn(
						"-right-0.5 -bottom-0.5 box-content p-0 ring-0",
						PIP_SIZE[size],
						SURFACE_CUTOUT[surface],
						presenceBadgeClass(presence),
						badgeClassName,
					)}
				/>
			) : null}
		</Avatar>
	);
}

/** @deprecated Prefer UserAvatar — same component. */
export const PresenceAvatar = UserAvatar;
export type PresenceAvatarProps = UserAvatarProps;
