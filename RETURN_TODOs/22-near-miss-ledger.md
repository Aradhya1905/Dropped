# 22 — Near-miss ledger

**Effort:** S · **Where:** client only · **Status:** planned
**Plan:** [2026-08-08-22-near-miss-ledger.md](../.claude/plans/2026-08-08-22-near-miss-ledger.md)

## What

The app quietly remembers the sealed drops you came close to but did not open —
inside a few hundred metres, never inside 50 m — and tells you at the end of the
day: *"You passed 3 secrets today. Two are still there."*

No pins for them, no map trail back, no coordinates kept. A count and a
direction to walk tomorrow.

## Why

A walk that reveals nothing currently produces nothing at all, and most walks
reveal nothing.

- The walk engine already fetches every drop within 600 m of each background fix
  (`walkEngine/index.ts:59`) and already computes the nearest distance to drive
  the GPS cadence (`index.ts:181`). **The near-miss is computed and thrown away
  on every single pass.** This ticket keeps a tally of it and nothing more.
- It turns the app's most common outcome — "I walked and nothing happened" —
  into the setup for the next walk. That is a return reason built out of data
  already in memory.
- It is the honest counterpart to [01](../FUN_TODOs/01-fog-of-war.md): fog shows
  where you *have* been; this shows what you were near while you were there.
- Zero new network traffic, zero new GPS, zero new permissions. The cheapest
  retention item in either folder.

## Client work

- A tally in `services/walkEngine`'s existing `onFix` pass: for each fix, count
  drop ids seen between ~60 m and ~250 m that this device has not revealed.
  Store **ids and a day key only** — never coordinates, never distances.
- Persist to MMKV alongside `producerState`, capped and day-bucketed, evicted
  after a few days. Same discipline as `FIRED_ID_CAP`.
- Surface on the **Trail**, not as a notification: a line above the tabs, in the
  same slot the echo card already uses. One sentence, dismissible, gone the next
  day.
- "Still there" = the id came back in a later `nearby` response. Do not query
  for it specially; use what the map already fetched.
- **Privacy zones bind this at capture.** The tally is written inside `onFix`,
  which already returns early on `insideZone` before the fix leaves the device
  (`walkEngine/index.ts:166`) — keep the write below that guard, never above it.
  A near-miss recorded at home is a record of being home.

## Risks / notes

- **This must not become a nag.** No notification, no badge, no "you missed 3".
  The framing is *there is more here than you thought*, never *you failed*.
  If the copy can be read as a scold, it is wrong.
- Do not show which ones, or where. A list of near-misses with places attached
  is a treasure map, and it hands out coordinates the user has not walked to.
- The 60 m floor exists so a drop you deliberately chose not to open — or one
  you opened — never shows up as a miss. Below the reveal radius the app should
  have offered it, not counted it.
- Interacts with [02](../FUN_TODOs/02-warmth-haptics.md): a drop that already
  buzzed at you and was ignored is not a near-miss, it is a decision. Exclude
  anything the hum fired about (`producerState.firedDropIds` already lists them).
