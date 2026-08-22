import { type Brand, brandAs } from "@/domain/brand";

export type UserId = Brand<string, "UserId">;
export type ServerId = Brand<string, "ServerId">;
export type ChannelId = Brand<string, "ChannelId">;
export type MessageId = Brand<string, "MessageId">;
export type RoleId = Brand<string, "RoleId">;
export type SessionId = Brand<string, "SessionId">;
export type InviteCode = Brand<string, "InviteCode">;
export type BotId = Brand<string, "BotId">;

function parseBranded<B extends string>(
	label: B,
	value: unknown,
): Brand<string, B> {
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		value !== value.trim()
	) {
		throw new TypeError(`Invalid ${label}`);
	}
	return brandAs<string, B>(value);
}

export const parseUserId = (value: unknown): UserId =>
	parseBranded("UserId", value);
export const parseServerId = (value: unknown): ServerId =>
	parseBranded("ServerId", value);
export const parseChannelId = (value: unknown): ChannelId =>
	parseBranded("ChannelId", value);
export const parseMessageId = (value: unknown): MessageId =>
	parseBranded("MessageId", value);
export const parseRoleId = (value: unknown): RoleId =>
	parseBranded("RoleId", value);
export const parseSessionId = (value: unknown): SessionId =>
	parseBranded("SessionId", value);
export const parseInviteCode = (value: unknown): InviteCode =>
	parseBranded("InviteCode", value);
export const parseBotId = (value: unknown): BotId =>
	parseBranded("BotId", value);
