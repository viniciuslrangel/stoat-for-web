import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayInitials } from "@/lib/display-initials";
import { cn } from "@/lib/utils";

export type EntityAvatarSize = "sm" | "default" | "lg" | "xl" | "rail";

const SIZE_CLASS: Record<EntityAvatarSize, string> = {
	sm: "size-6",
	default: "size-8",
	lg: "size-10",
	xl: "size-16",
	rail: "size-[42px]",
};

const FALLBACK_TEXT: Record<EntityAvatarSize, string> = {
	sm: "text-[10px]",
	default: "text-xs",
	lg: "text-sm",
	xl: "text-lg",
	rail: "text-xs",
};

export type EntityAvatarProps = {
	name: string;
	src?: string | null;
	size?: EntityAvatarSize;
	/** Soft neo-brutal thick outline (server rail icons). Off by default. */
	bordered?: boolean;
	className?: string;
	fallbackClassName?: string;
	title?: string;
};

/**
 * Non-user entity icon (server, group, bot, invite). No presence pip.
 * Shares circular chrome with UserAvatar; does not own status stacking.
 */
export function EntityAvatar({
	name,
	src,
	size = "default",
	bordered = false,
	className,
	fallbackClassName,
	title,
}: EntityAvatarProps) {
	const avatarSize = size === "xl" || size === "rail" ? "lg" : size;

	return (
		<Avatar
			size={avatarSize}
			title={title}
			data-entity-avatar-size={size}
			className={cn(
				"overflow-hidden rounded-full after:rounded-full after:border-border",
				SIZE_CLASS[size],
				bordered && "border-[3px] border-border after:border-transparent",
				className,
			)}
		>
			{src ? <AvatarImage src={src} alt="" className="rounded-full" /> : null}
			<AvatarFallback
				className={cn(
					"rounded-full bg-raised font-bold text-foreground",
					FALLBACK_TEXT[size],
					fallbackClassName,
				)}
			>
				{displayInitials(name)}
			</AvatarFallback>
		</Avatar>
	);
}
