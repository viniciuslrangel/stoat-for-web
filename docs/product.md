# Product brief

This file is the product contract for the Stoat React rewrite. Discord is the UX reference. The Stoat API is the backend. Listed fork invariants beat Discord.

Target instance is `https://stoat.viniciusrangel.dev`. Registration is invite-only. Read `features.invite_only` from `GET /`. Do not hard-code it.

## Decision rule

When a choice appears, apply the first matching line. Stop there.

1. If the choice is a listed fork invariant, ship that invariant even when Discord does the opposite.
2. If the Stoat API cannot support the Discord feature, do not fake it and do not ship a dead control.
3. Otherwise match Discord's feel. Layout, density, keyboard habits, and chrome follow Discord, not the old Solid client.

If you still cannot decide, keep the Stoat payload and the Discord interaction. Do not ask the human.

Stoat protocol names stay in the API. Presence `Busy` is sent as `Busy`. The UI may label it Do Not Disturb. Presence `Focus` exists on Stoat and not on Discord. Ship Focus. Do not invent Discord-only statuses.

Old-client URL trampolines are not a product requirement. Overlay chrome is. Keep a real URL only when people share it or bookmark it. See Settings and modals.

## Layout and navigation

Desktop is three columns.

1. Server rail. Home, unread DMs, servers, create or join, user avatar with status.
2. Channel list. Home sidebar or server sidebar.
3. Main pane. Chat, then a member list on the right for servers and groups.

The composer sits at the bottom of the chat column. Message history is virtualized. Mute and deafen live in the voice bar the way Discord places them. In-call video is a tile grid with a focus mode. Right-click opens a context menu. Unread and mention badges sit on the rail and on channel rows. Friends also shows a pending badge.

Home sidebar contains Home, Friends, Saved Notes, then DMs and groups. Server sidebar contains the server header, categories, and channels. Voice-capable channels show a headset and a pre-join participant row. Member list is on for servers and groups. Member list is off for DMs and Saved Notes. Search and pins replace the member column without changing the URL.

Phone is one pane plus a slide drawer for the rail and the channel list. Do not keep a persistent three-column grid on a phone.

Friends is a page at `/friends`. Tabs are Online, All, Pending, and Blocked. Tabs are in-page state, not URLs. Add friend is a control on that page. Clicking a friend row opens a DM. Profile stays on the avatar, the context menu, or a profile action.

Status menu is Online, Idle, Focus, Do Not Disturb, and Invisible, plus optional custom status text. Do Not Disturb writes `Busy` to the API.

Keep these URL shapes because people share them.

- `/login` and the auth flows under it, including `/login/create/:code` for invite-only signup
- `/app` as the logged-in home
- `/friends`
- `/invite/:code`
- `/bot/:code`
- `/channel/:channelId` and `/channel/:channelId/:messageId` for DMs, groups, and Saved Notes
- `/server/:serverId` redirects to the default channel
- `/server/:serverId/channel/:channelId` and an optional trailing message id for server channels

Last-active path per server is Discord-like. Clicking a server opens the last channel in that server, else the default channel.

Discover is an official-instance iframe of `stt.gg`. This self-host is not that instance. Hide Discover.

## What we will not copy from Discord

The explorers do not show API support for these Discord products. Do not ship them.

- Threads
- Forum channels
- Stage channels. Stoat voice is `channel.isVoice` on a text-like channel, not a Stage
- Nitro, boosts, a premium paywall, or the old client's hidden `subscribe` page
- Server folders
- Server discovery as a first-party marketplace on this instance
- Activities, in-call games, and soundboard
- Discord's autoplay of remote screen shares
- Discord deafen mutes stream audio. Ours does not.

Do not invent a Discord control whose only backend is a stub. If `limits().video` is off, disable camera and screen share the way the old client does. Do not show Nitro upsell in that hole.

Keep Stoat-only protocol features that Discord lacks when the API already has them. Custom emoji, reactions, pins, slowmode, webhooks, bots, masquerade, Saved Notes, and per-server identity stay.

## Fork invariants

These beat Discord. A later worker does not get to "match Discord" here.

1. Share volume 0 is silence. Store `0`. Do not coerce it to `1` with `||`.
2. Remote screen shares are opt-in. Connect with `autoSubscribe: false`. Do not subscribe ScreenShare or ScreenShareAudio until Resume watching or an explicit tile click. Mic and camera are unchanged.
3. Deafen mutes remote voice. Deafen does not mute screen-share audio.
4. A voice-capable channel splits call on top and chat below. The in-call ratio persists. Drag stays.
5. Mic noise suppression defaults to RNNoise. The stored value is `enhanced`. Browser NS and off remain available.
6. Pre-join UI shows who is in the call from `channel.voiceParticipants`. Join card and sidebar both show it before LiveKit connect.
7. End Call leaves the LiveKit room. Disconnect the room, bump the connect session, and drop the local id from `voiceParticipants` immediately.
8. Mute and deafen buttons follow LiveKit publication state. Unmute while deafened undeafens, then enables the mic.
9. Screen share default quality is gaming: 1080p60 at 18 Mbps when `limits().video_resolution` allows it.

After Resume watching, share audio follows that share's stored mute and volume. Do not add a second hidden mute default. Volume 0 still silence.

## Settings and modals

User, server, and channel settings are a full-screen overlay. Escape closes it. The overlay matches Discord. The old client bounced `/settings` off a URL trampoline. Do not keep that trampoline as the UX.

Do not keep the user on `/settings` as a page. If `/settings` is opened as a deep link, open the user overlay and put the previous app path back in the URL.

Friends stays at `/friends`. Invites stay at `/invite/:code`. Bot invites stay at `/bot/:code`. Signup invites stay at `/login/create/:code`. Those URLs match what people paste.

Settings pages are overlay state, not routes. User pages keep the old client's ids: account, profile, sessions, bots, voice, appearance, notifications, language, advanced. Native is included only when `window.native` is set. Server pages keep overview, emojis, roles, invites, and bans. Channel pages keep overview, permissions, and webhooks.

Modals cover create, join, invite, profile, MFA, delete, and the rest of the old client's implemented modal types. Unimplemented types such as `leave_group` and `close_dm` stay unused. Leave group and close DM go through `delete_channel`.
