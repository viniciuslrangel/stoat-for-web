import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user";
import type { ChannelSnapshot } from "@/hooks/chat-snapshots";
import {
	buildGroupMemberList,
	buildMemberListSections,
	type MemberListMember,
	type MemberListSection,
	type MemberListSnapshot,
} from "@/hooks/member-list-snapshots";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { cn } from "@/lib/utils";

function MemberRow({ member }: { member: MemberListMember }) {
	return (
		<li
			data-testid={`member-row-${member.id}`}
			className={cn(
				"flex h-10 items-center gap-2 rounded-md border-[3px] border-transparent px-2",
				"hover:border-border hover:bg-sidebar-accent",
				!member.online && "opacity-60",
			)}
		>
			<UserAvatar
				name={member.displayName}
				src={member.avatarUrl}
				presence={member.presence}
				size="default"
				surface="sidebar"
			/>
			<span
				className="min-w-0 truncate text-sm font-medium"
				style={member.roleColour ? { color: member.roleColour } : undefined}
			>
				{member.displayName}
			</span>
		</li>
	);
}

function Section({ section }: { section: MemberListSection }) {
	return (
		<div data-testid={`member-section-${section.key}`}>
			<div className="px-2 pt-3 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
				{section.label} — {section.members.length}
			</div>
			<ul className="flex flex-col gap-0.5">
				{section.members.map((member) => (
					<MemberRow key={member.id} member={member} />
				))}
			</ul>
		</div>
	);
}

function showOnlineSummary(list: MemberListSnapshot): boolean {
	if (list.onlineCount <= 0) {
		return false;
	}
	return list.sections.some(
		(section) =>
			section.key === "online" ||
			section.key === "offline" ||
			section.key.startsWith("role:"),
	);
}

function MemberListBody({
	list,
	loading,
}: {
	list: MemberListSnapshot;
	loading: boolean;
}) {
	if (loading && list.sections.length === 0) {
		return (
			<div
				className="flex flex-col gap-2 px-2 pt-4"
				data-testid="member-list-loading"
			>
				<Skeleton className="h-3 w-24 rounded-md bg-muted" />
				<Skeleton className="h-8 w-full rounded-md bg-muted" />
				<Skeleton className="h-8 w-full rounded-md bg-muted" />
				<Skeleton className="h-8 w-full rounded-md bg-muted" />
			</div>
		);
	}

	if (list.sections.length === 0) {
		return (
			<p
				className="px-4 pt-4 text-sm text-muted-foreground"
				data-testid="member-list-empty"
			>
				No members to show.
			</p>
		);
	}

	return (
		<div className="flex flex-col overflow-y-auto px-2 pb-4">
			{showOnlineSummary(list) ? (
				<div className="px-2 pt-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
					{list.onlineCount} online
				</div>
			) : null}
			{list.sections.map((section) => (
				<Section key={section.key} section={section} />
			))}
		</div>
	);
}

export function MemberList({ channel }: { channel: ChannelSnapshot }) {
	const { members, hoistedRoles, loading } = useChannelMembers(channel);
	const list =
		channel.type === "Group"
			? buildGroupMemberList(members)
			: buildMemberListSections(members, hoistedRoles);

	return (
		<aside
			data-testid="member-list"
			aria-label="Members"
			className="flex h-full min-w-0 flex-1 flex-col border-l-[3px] border-border sidebar-surface"
		>
			<MemberListBody list={list} loading={loading} />
		</aside>
	);
}
