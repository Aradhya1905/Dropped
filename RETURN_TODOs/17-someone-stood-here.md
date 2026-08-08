# 17 — Someone stood here

**Effort:** L · **Where:** backend + client · **Status:** planned
**Plan:** [2026-08-08-17-someone-stood-here.md](../.claude/plans/2026-08-08-17-someone-stood-here.md)

## What

The author's half of the loop. When people find, heart, or reply to something
you dropped, the app eventually tells you — as a **count about a place**, never
as an event about a person.

Three surfaces, smallest to largest:

- a quiet mark on the **Trail** tab when there is anything new;
- a **receipt** on each of your drops in the Trail's "dropped" list: *"4 have
  stood here · 1 voice"*;
- at most one ambient **hum** a day, through the existing gate: *"Someone stood
  where you stood."*

## Why

The single biggest hole left in the product, and the cheapest big one to fill —
the data is already in the database.

- Today, dropping is a write into a void. You type a confession, you get screen
  09, and the app never mentions it again. Every reason to reopen Dropped is
  currently a reason to *walk*; there is none that survives a rainy week.
- `drops.reveal_count`, `stood_here`, `heart_count` and `reply_count` are all
  maintained already (`tables.md`). Nothing reads them back to the author.
  Grepping both repos for author-side notification finds nothing.
- [03](../FUN_TODOs/03-replies-in-place.md) is described in its own ticket as
  "the retention feature", and it half-works: a reader can now answer a drop,
  and the author has no way to learn that they did. 17 is what makes 03 pay off.
- It is the only feature in either folder that rewards **dropping** rather than
  walking. `DROP_DAILY_LIMIT` is 5/device/day and most users will never hit it,
  because nothing has ever suggested that dropping does anything.

## Privacy — read this before writing code

A reveal is a stranger standing at a coordinate at a time. Handing that to the
author, even implicitly, is the worst failure this app can produce. The rules:

- **Counts only. Never a timestamp, never a coordinate, never an identifier**,
  not even a hashed one. The response says *how many*, never *who* or *when
  exactly*.
- **Delay and bucket.** Activity is reported no finer than a **day**, and only
  after a **≥ 6 h** lag, so "someone read it" can never be correlated with
  "someone I watched walk past my bench". A single reveal on a quiet drop is
  still identifying if it lands instantly.
- **Suppress small numbers on precise places.** A drop with exactly one reveal
  in a day says "4 have stood here" only once the total crosses a floor;
  below it the copy stays vague ("someone has stood here").
- **No live presence, ever.** Not "someone is here now", not "5 minutes ago".
  See the folder README.
- The endpoint answers only about **drops the calling device authored**. That is
  the same posture as `/devices/me/*` and `/drops/echoes`: nothing is disclosed
  that the caller did not already do.

## Backend work (`C:\My_Projects\Dropped_Backend`)

- **Migration** `drizzle/0010_author_activity.sql`
  - `drops.author_seen_at timestamptz` — the author's read cursor, so deltas
    survive a reinstall of the app but never require storing per-reader rows.
  - Index `reveals (drop_id, created_at)` — the delta query is
    "reveals on my drops since a cursor", and the composite PK
    `(drop_id, device_id)` cannot serve the `created_at` half.
  - Same for `hearts (drop_id, created_at)` and `replies (drop_id, created_at)`.
- **`GET /devices/me/activity`** → `{ drops: [{ dropId, placeLabel, city, mood,
  newReveals, newHearts, newReplies, since }], totals: {…} }`.
  - Counts rows strictly older than `now() - INTERVAL '6 hours'` (the lag) and
    newer than `author_seen_at`.
  - `status = 'visible'` drops only — never report activity on something that
    got moderated away.
  - Per-route rate limit; the client polls this.
- **`POST /devices/me/activity/seen`** → advances `author_seen_at` for the
  listed drop ids (or all). Idempotent, monotonic — never moves backwards.
- **Erasure** — `deviceRepo.erase` must clear the cursor along with the rest.
  `author_seen_at` lives on `drops`, which is *anonymised* rather than deleted,
  so the column has to be nulled in step 9 of the erase transaction or an erased
  author's cursor rides along on a row that outlives them.

## Client work

- `services/notifications/types.ts` — the adapter exposes exactly one
  notification (`notifyNearbySecret`). This needs a second,
  `notifyAuthorActivity`, plus a distinct channel/category so a user can mute
  "your drops" without muting "near you".
- `services/notifications/gate.ts` — extend `shouldNotify` to take a **kind**.
  Privacy zone, master switch and quiet hours apply to both kinds; radius,
  mood and movement are meaningless for activity and must be skipped rather
  than faked. **Do not add a second gate.**
- A once-a-day poll on the walkEngine's existing pass and on app foreground —
  no new timer, no new watch.
- `features/trail` — a receipt line on each dropped card, and a mark on the
  Trail tab. `TabBarItem` (`design-system/components/TabBar.tsx`) has no badge
  affordance yet; add a small ink dot, not a red numeral.
- Settings row on the You tab, defaulting **on** for the in-app surfaces and
  **off** for the hum. Lives with the rest of
  [13](../FUN_TODOs/13-settings-retention.md)'s levers.

## Risks / notes

- **The gate is the risk.** Every quiet-hours and privacy-zone guarantee the app
  makes today holds because there is exactly one place that decides. A second
  notification kind is the moment that stops being true by accident. Extend the
  existing function and its tests; do not introduce a parallel path.
- **Empty is the normal case at first.** Most drops will collect zero reveals
  for weeks. The surfaces must be graceful and silent when there is nothing —
  a "0 have stood here" receipt is worse than no receipt.
- Interacts with [21](21-before-it-fades.md), which needs the same delivery
  path. Build 17 first and 21 becomes small.
- Deliberately **not** a score. No totals across drops on a profile, no ranking,
  no "top drop". FUN_TODOs rules out leaderboards and this is where that rule
  gets tested.
