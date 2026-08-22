# Duplicated components / copy-pasted UI audit
date: 2026-08-21
workspace: stoat-vps-worktrees/stoat-web-react
scope: src/components/** (+ related hooks usage)
avatar note: sibling is unifying UserAvatar / PresenceAvatar — listed below for handoff, NOT merged in this pass.

---

## 1. Duplicates found

### P0 — Avatar / initials / presence (in flight — do not touch)

| Overlap | Paths | What overlaps |
| --- | --- | --- |
| Shared PresenceAvatar already exists; still raw Avatar+initials elsewhere | `src/components/user/PresenceAvatar.tsx` (canonical + `UserAvatar` alias) | Initials helper (word-aware), AvatarImage/Fallback, optional presence pip |
| Settings account card still hand-rolls Avatar | `src/components/settings/SettingsOverlay.tsx` (`AccountPanel`, `displayInitials`) | size-16 Avatar + primary fallback initials; no PresenceAvatar |
| Server / group entity icons (not user presence) | `src/components/shell/ServerRail.tsx` (server icons + local `initials`); `src/components/shell/HomeSidebar.tsx` (group branch Avatar + naive `slice(0,2)` initials) | Same AvatarImage/Fallback chrome as PresenceAvatar but without pip; duplicate initials fns |
| Invite / bot large entity avatars | `src/components/invite/InviteJoinCard.tsx` (`InviteAvatar`); `src/components/bot/AddBotCard.tsx` (`BotAvatar`) | Identical size-16 Avatar + first-letter fallback |
| Voice tiles use initials box, not Avatar | `src/components/voice/VoiceCallPanel.tsx` (`participant.name.slice(0,2)`) | Custom size-10 initials square; no Autumn URL / presence |
| Consumers already on PresenceAvatar / UserAvatar | `MessageList.tsx`, `MemberList.tsx`, `FriendRow.tsx`, `FriendsPage.tsx` (`FriendProfileDialog`), `ServerRail.tsx` (self), `HomeSidebar.tsx` (DM) | Good — sibling should route remaining raw Avatar sites here |

**Sibling handoff files (avatar merge targets):**
- `src/components/settings/SettingsOverlay.tsx`
- `src/components/shell/ServerRail.tsx` (server icons + extract shared `displayInitials`)
- `src/components/shell/HomeSidebar.tsx` (group icons + drop local initials)
- `src/components/invite/InviteJoinCard.tsx` / `src/components/bot/AddBotCard.tsx`
- `src/components/voice/VoiceCallPanel.tsx` (optional later: UserAvatar when participant avatar URLs exist)
- Canonical: `src/components/user/PresenceAvatar.tsx` + `src/components/user/index.ts`

Suggested shared modules for sibling:
- `UserAvatar` / `PresenceAvatar` (already) — settings + friends profile + rail self
- `EntityAvatar` (server/group/bot/invite icon, no presence pip) — ServerRail, HomeSidebar groups, InviteAvatar, BotAvatar
- `lib/display-initials.ts` — single initials algorithm (word-aware; replace 4 local copies)

---

### P1 — High-value non-avatar consolidation

| Overlap | Paths | Suggested shared module |
| --- | --- | --- |
| Destination landing chrome (header + loading skeletons + hero + action grid) | Was copy-pasted in `HomeDashboard.tsx` ↔ `DiscoverUnavailable.tsx` | **DONE this pass:** `shell/DestinationLanding.tsx` (`DestinationLanding`, `LandingActionBody`, `landingActionClassName`) |
| Invite / add-bot Decline CTA | Was identical in `InviteJoinCard.tsx` ↔ `AddBotCard.tsx` | **DONE this pass:** `invite/DeclineLink.tsx` |
| Invite / add-bot card state machine UI | `InviteJoinCard.tsx`, `AddBotCard.tsx` | `invite/InvitePreviewCardShell.tsx` — loading skeleton card, error card (Log in + Decline), success header layout still mostly duplicated |
| Navigate to server-or-channel destination | `InviteJoinCard.goToDestination` + `AddBotCard.onAdd` navigate branches | `lib/navigate-destination.ts` or hook helper |
| Sidebar active row styles | `HomeSidebar.tsx` (`navClass` + DM row cn), `ServerSidebar.tsx` (channel Link cn), `SettingsOverlay.tsx` (category buttons) | `shell/sidebarItemClass(active, variant: "nav" \| "channel" \| "settings")` |
| Panel chrome: aside + h-12 title bar + ScrollArea | `HomeSidebar.tsx`, `ServerSidebar.tsx`, `MemberList.tsx` (aside only) | `shell/SidebarPanel.tsx` (`title`, `borderSide: "left"\|"right"`, children) |
| Content pane h-12 header | `ChatPane.tsx`, `FriendsPage.tsx`, `HomeDashboard`/`Discover` (via DestinationLanding), `AppShell.tsx` mobile | `shell/ContentHeader.tsx` |
| Section label “LABEL — N” uppercase | `FriendsPage.FriendList`, `MemberList.Section`, `HomeSidebar` DM label, Settings group titles | `ui/SectionLabel.tsx` or `shell/ListSectionHeader.tsx` |
| Hoverable user/list rows | `FriendRow.tsx` (h-14), `MemberList.MemberRow` (h-10) | `shell/UserListRow.tsx` — avatar slot + primary/secondary text + trailing actions |

---

### P2 — Lower priority / intentional similarity

| Overlap | Paths | Notes |
| --- | --- | --- |
| Auth Card shells | `LoginForm`, `RegisterForm`, `ResetForm`, `ResetConfirmForm`, `ResendForm`, `VerifyCard`, `CheckEmailCard`, `WelcomeCard`, `DeleteAccountCard` | Same `Card size="sm" max-w-sm` + header/description; AuthShell already wraps canvas. Optional `AuthCard` wrapper — low urgency while forms diverge |
| Auth submit + Loader2 | All auth forms + invite/bot pending buttons | Pattern is fine; optional `SubmitButton` with `pending`/`pendingLabel` |
| Message inline image vs attachment image markup | `MessageContent.tsx` (`case "image"` vs `AttachmentImage`) | Near-identical `<a><img>` neo-brutal border; extract `MessageImageLink` inside same file |
| Empty copy | `MessageList` (“No messages yet”), `MemberList` (“No members”), `FriendsPage` tab empties, `VoiceCallPanel` (“No one is here yet”) | Discord-style empties differ by context — shared `EmptyState` only if styling unifies |
| Loading skeleton strips | Sidebars, MessageList pulse blocks, Home/Discover (now shared), Friends | Prefer composing `Skeleton` with shared size tokens over a mega component |
| Channel type icons Hash/Volume2 | `ChatPane.tsx`, `ServerSidebar.tsx` | Tiny helper `channelTypeIcon(isVoice)` already local in ServerSidebar — export once |
| Friend profile identity block vs settings account card | `FriendsPage.FriendProfileDialog` vs `SettingsOverlay.AccountPanel` | Both name+handle under avatar; after UserAvatar merge, optional `UserIdentityHeader` |

---

## 2. Priority summary

| Pri | Item | Owner / next step |
| --- | --- | --- |
| **P0** | Finish UserAvatar / PresenceAvatar / EntityAvatar + shared initials | Sibling avatar worker — see handoff file list above |
| **P1** | InvitePreviewCardShell + navigate-destination | Next non-avatar pass |
| **P1** | sidebarItemClass + SidebarPanel + ContentHeader + SectionLabel | Shell chrome pass |
| **P1** | UserListRow (FriendRow ↔ MemberRow) | Friends/members pass |
| **P2** | AuthCard / SubmitButton, MessageImageLink, EmptyState | Polish |

---

## 3. Suggested shared modules (target tree)

```
src/components/user/
  PresenceAvatar.tsx   # existing — users + presence pip
  EntityAvatar.tsx     # NEW — server/group/bot/invite icons (sibling)

src/lib/
  display-initials.ts  # NEW — single initials helper (sibling)

src/components/shell/
  DestinationLanding.tsx  # NEW this pass
  SidebarPanel.tsx        # proposed
  ContentHeader.tsx       # proposed
  sidebarItemClass.ts     # proposed
  UserListRow.tsx         # proposed

src/components/invite/
  DeclineLink.tsx             # NEW this pass
  InvitePreviewCardShell.tsx  # proposed

src/components/ui/ or shell/
  SectionLabel.tsx  # proposed
```

---

## 4. What this pass fixed

1. **`DestinationLanding`** — extracted shared Home/Discover landing chrome + action body helpers.
   - `src/components/shell/DestinationLanding.tsx` (new)
   - `src/components/shell/HomeDashboard.tsx` (refactored)
   - `src/components/discover/DiscoverUnavailable.tsx` (refactored)
2. **`DeclineLink`** — single Decline CTA for invite + add-bot cards.
   - `src/components/invite/DeclineLink.tsx` (new)
   - `src/components/invite/InviteJoinCard.tsx` / `src/components/bot/AddBotCard.tsx` (import shared)
3. **Tests:** `DiscoverUnavailable.test.tsx`, `AddBotCard.test.tsx`, `InviteJoinCard.test.tsx` — 6/6 passed.
4. **Not touched:** any avatar/initials/presence merge (deferred to sibling).
5. **No commit** (per brief).

---

## Method notes

- Grepped: Avatar/Presence/initials, border-[3px]/nb-shadow chrome, empty states, lucide icon rows, h-12 headers, section uppercase labels.
- Compared near-duplicate files under `src/components/{shell,discover,friends,chat,auth,invite,bot,settings,voice,user}`.
- Preference alignment: Discord IA preserved; soft neo-brutal borders left as-is; exclusive write to consolidation files only.
