import { resolveUserMention, type UserNameLookup } from "@/lib/mentions";
import {
	type InlineToken,
	isImageAttachment,
	type MessageAttachmentSnapshot,
	type MessageContentBlock,
	parseMessageContent,
} from "@/lib/message-content";
import { cn } from "@/lib/utils";

const chipClass =
	"inline rounded-md bg-primary/15 px-1 py-0.5 font-semibold text-primary align-baseline";

const EMPTY: UserNameLookup = new Map();
const EMPTY_ATTACHMENTS: readonly MessageAttachmentSnapshot[] = [];

function MentionChip({
	label,
	title,
	testId,
}: {
	label: string;
	title: string;
	testId: string;
}) {
	return (
		<span className={chipClass} title={title} data-testid={testId}>
			{label}
		</span>
	);
}

function renderInlineToken(
	token: InlineToken,
	index: number,
	usersById: UserNameLookup,
	channelsById: UserNameLookup,
	rolesById: UserNameLookup,
) {
	switch (token.type) {
		case "text":
			return <span key={index}>{token.value}</span>;
		case "link":
			return (
				<a
					key={index}
					href={token.href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
					data-testid="message-link"
				>
					{token.label}
				</a>
			);
		case "image":
			return (
				<a
					key={index}
					href={token.src}
					target="_blank"
					rel="noopener noreferrer"
					className="my-1 block max-w-md"
					data-testid="message-content-image-link"
				>
					<img
						src={token.src}
						alt={token.alt}
						loading="lazy"
						referrerPolicy="no-referrer"
						className="max-h-80 max-w-full rounded-md border-[3px] border-border object-contain"
						data-testid="message-content-image"
					/>
				</a>
			);
		case "user": {
			const resolved = resolveUserMention(token.id, usersById);
			return (
				<MentionChip
					key={index}
					label={`@${resolved.name}`}
					title={token.id}
					testId="mention-user"
				/>
			);
		}
		case "channel": {
			const name = channelsById.get(token.id)?.trim();
			return (
				<MentionChip
					key={index}
					label={name && name.length > 0 ? `#${name}` : "#Unknown channel"}
					title={token.id}
					testId="mention-channel"
				/>
			);
		}
		case "role": {
			const name = rolesById.get(token.id)?.trim();
			return (
				<MentionChip
					key={index}
					label={name && name.length > 0 ? `@${name}` : "@Unknown role"}
					title={token.id}
					testId="mention-role"
				/>
			);
		}
		case "everyone":
			return (
				<MentionChip
					key={index}
					label="@everyone"
					title="everyone"
					testId="mention-everyone"
				/>
			);
		case "online":
			return (
				<MentionChip
					key={index}
					label="@online"
					title="online"
					testId="mention-online"
				/>
			);
		case "emoji":
			return (
				<span key={index} title={token.id} data-testid="mention-emoji">
					:{token.id}:
				</span>
			);
		default: {
			const _exhaustive: never = token;
			return _exhaustive;
		}
	}
}

function CodeBlock({
	language,
	value,
}: {
	language: string | null;
	value: string;
}) {
	return (
		<pre
			data-testid="message-code-block"
			data-language={language ?? undefined}
			className="my-1.5 max-w-full overflow-x-auto rounded-md border-[3px] border-border bg-[#1a1a1f] px-3 py-2 text-[0.8125rem] leading-relaxed text-[#e8e6e1]"
		>
			{language ? (
				<div
					className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/80"
					data-testid="message-code-language"
				>
					{language}
				</div>
			) : null}
			<code className="font-mono whitespace-pre-wrap break-words">{value}</code>
		</pre>
	);
}

function renderBlock(
	block: MessageContentBlock,
	index: number,
	usersById: UserNameLookup,
	channelsById: UserNameLookup,
	rolesById: UserNameLookup,
) {
	if (block.type === "code") {
		return (
			<CodeBlock key={index} language={block.language} value={block.value} />
		);
	}
	return (
		<span key={index} className="whitespace-pre-wrap">
			{block.tokens.map((token, tokenIndex) =>
				renderInlineToken(
					token,
					tokenIndex,
					usersById,
					channelsById,
					rolesById,
				),
			)}
		</span>
	);
}

function AttachmentImage({
	attachment,
}: {
	attachment: MessageAttachmentSnapshot;
}) {
	return (
		<a
			href={attachment.url}
			target="_blank"
			rel="noopener noreferrer"
			className="my-1 block max-w-md"
			data-testid="message-attachment-image-link"
		>
			<img
				src={attachment.url}
				alt={attachment.filename ?? "Attachment"}
				loading="lazy"
				referrerPolicy="no-referrer"
				className="max-h-80 max-w-full rounded-md border-[3px] border-border object-contain"
				data-testid="message-attachment-image"
			/>
		</a>
	);
}

function AttachmentFile({
	attachment,
}: {
	attachment: MessageAttachmentSnapshot;
}) {
	const label = attachment.filename ?? "Attachment";
	return (
		<a
			href={attachment.url}
			target="_blank"
			rel="noopener noreferrer"
			className="my-1 inline-flex max-w-md items-center gap-2 rounded-md border-[3px] border-border bg-muted/60 px-2.5 py-1.5 text-sm text-primary underline-offset-2 hover:underline"
			data-testid="message-attachment-file"
		>
			{label}
		</a>
	);
}

/**
 * Renders Stoat message content: mentions, links, code fences, image URLs,
 * and Autumn attachment embeds. Pass plain snapshots only; no SDK objects.
 */
export function MessageContent({
	content,
	attachments = EMPTY_ATTACHMENTS,
	usersById = EMPTY,
	channelsById = EMPTY,
	rolesById = EMPTY,
	className,
}: {
	content: string;
	attachments?: readonly MessageAttachmentSnapshot[];
	usersById?: UserNameLookup;
	channelsById?: UserNameLookup;
	rolesById?: UserNameLookup;
	className?: string;
}) {
	const blocks = parseMessageContent(content);
	const bodyEmpty = content.length === 0;

	return (
		<div
			data-testid="message-content"
			className={cn("break-words text-sm text-foreground/90", className)}
		>
			{bodyEmpty ? (
				<span className="whitespace-pre-wrap"> </span>
			) : (
				blocks.map((block, index) =>
					renderBlock(block, index, usersById, channelsById, rolesById),
				)
			)}
			{attachments.map((attachment) =>
				isImageAttachment(attachment) ? (
					<AttachmentImage key={attachment.id} attachment={attachment} />
				) : (
					<AttachmentFile key={attachment.id} attachment={attachment} />
				),
			)}
		</div>
	);
}
