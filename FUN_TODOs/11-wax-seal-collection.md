# 11 — Wax seal collection

**Effort:** S · **Where:** client only · **Status:** todo
**Plan:** [2026-08-07-11-wax-seal-collection.md](../.claude/plans/2026-08-07-11-wax-seal-collection.md)

## What

Every revealed secret leaves its broken wax seal in the Trail scrapbook. Seals
vary by mood, by rarity (a drop nobody else has revealed vs. one with 200
reveals), by time of day, by city. The Trail tab becomes a sheet of collected
seals.

## Why

Collection without competition. There's no score, no leaderboard, nothing to
optimise — you just accumulate evidence of where you've been, which is exactly
the tone of the app. It's the cheapest possible "one more" mechanic that doesn't
poison an anonymous UGC community the way points would.

`design-system/components/WaxSeal.tsx` already exists, and the design already
frames the Trail tab as a scrapbook, so this is mostly variation + layout.

## Client work

- Seal variants in the design system — a handful of stamp motifs, tinted by mood
  (share the mood→colour map from [06](06-mood-filter.md)).
- Derivation rules:
  - **first finder** (`revealCount === 1` at reveal time) — distinct seal.
  - **well-trodden** (high `revealCount`) — worn/faded seal.
  - **night find** — darker wax. Client-side; it knows the reveal timestamp.
  - **new city** — a seal marked with the `city`. **Needs the backend delta
    below.**
- Persist the derived variant at reveal time in MMKV so a seal doesn't change
  retroactively when someone else reveals the same drop later. That mutability
  would feel broken.
- Layout on `TrailScreen.tsx`: a grid of seals with the found/saved/dropped tabs
  filtering it.

## Backend work

Almost none, but **not zero** — `revealCount` is on `apiSecretSchema`, `city` is
**not**. The column exists on `drops` (migration `0001_drop_city.sql`) and the
row type carries it (`DropRow.city` in `drop.repo.ts`), but `toDrop()` in
`src/services/mappers.ts` doesn't map it onto the wire.

- Add `city: z.string().optional()` to `dropSchema` in
  `src/schemas/common.schema.ts` and pass it through `toDrop()`.
- Same one-line delta unblocks [10 city constellation](10-city-constellation.md);
  do it once, for both.

## Risks / notes

- Resist adding rarity *tiers* with names. The moment it looks like loot, the app
  stops being about the secrets.
- Keep the art in-palette. These are wax on paper, not badges.
