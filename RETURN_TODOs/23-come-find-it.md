# 23 — Come find it

**Effort:** M · **Where:** mostly client · **Status:** planned
**Plan:** [2026-08-08-23-come-find-it.md](../.claude/plans/2026-08-08-23-come-find-it.md)

## What

After you drop something, the app can hand you an image to send to one person:
a sealed card with a place, a mood, a date, and a link. Not the words — the
invitation. *"I left something for you here. You'll have to go."*

## Why

An anonymous, no-login, no-contacts app has exactly one growth mechanism
available to it, and this is it.

- [07](../FUN_TODOs/07-share-a-spot.md) built the *inbound* half: a deep link
  and a `/drops/:id/preview` route for someone who has a link and has not walked
  anywhere. `services/share.shareImage` exists. `TrailPostcard` exists — for a
  secret you **found**.
- Nothing produces the outbound artefact for a drop you **left**, which is the
  half with intent behind it. Somebody who has just written something for a
  specific person is the most motivated sharer this app will ever have, and at
  that exact moment (screen 09, `DroppedScreen`) it offers them nothing.
- It is also a retention feature disguised as a growth one: a drop somebody has
  been *told* to go find is a drop whose author has a reason to check back —
  which is [17](17-someone-stood-here.md)'s loop, with a person on the other end
  of it.
- The 50 m rule makes the share safe in a way most apps' shares are not. The
  recipient gets a promise and a walk, never the content.

## Client work

- A share affordance on `features/drop/screens/DroppedScreen.tsx` (screen 09)
  and on the Trail's dropped cards.
- A sealed-card image composed with `react-native-svg` and exported through
  `services/share.shareImage`, following `TrailPostcard`'s existing approach.
- The card shows: place label (coarse — the neighbourhood, never the bench),
  mood, date, wax seal, and the deep link from
  [07](../FUN_TODOs/07-share-a-spot.md). **It never shows the body**, and it
  must be impossible to make it show the body.
- Respect `drops.shareable` (already on the table, default true, with a
  `ShareableToggle` in the composer). A drop marked unshareable has no share
  affordance at all — not a disabled one, not one that explains itself.
- Copy is an invitation, never a brag. No counts on the card, no "0 people have
  found this".

## Backend work

None required — `/drops/:id/preview` and the `shareable` flag already exist.

Optional, only if the numbers justify it later: a per-drop `share_count`. Do not
build it speculatively; it is a metric, and the folder rules out scores.

## Risks / notes

- **The place label is the leak.** `placeLabel` can be as fine as a café name.
  A share image is forwarded, screenshotted, and posted; assume it becomes
  public. Show city + neighbourhood, never the precise label, and never the
  coordinate.
- This is the one ticket that puts app content on other platforms. It is also
  the one most likely to be used to send someone somewhere they should not go.
  The recipient walks to a coordinate on a stranger's say-so — keep the copy
  free of anything that reads as urgent or private-meeting-shaped, and keep the
  report path reachable from the preview screen.
- Do not add "share to story" templates per platform. One image, one system
  sheet, done — `react-native-share` already handles the fan-out, and RN's
  built-in `Share` cannot attach a file on Android (see the stack notes).
- Measure nothing about who shared what. The temptation to instrument a growth
  loop is exactly how an anonymous app stops being one.
