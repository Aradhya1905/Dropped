# 06 — Mood filter + mood-tinted pins

**Effort:** S · **Where:** backend + client · **Status:** todo
**Plan:** [2026-08-07-06-mood-filter.md](../.claude/plans/2026-08-07-06-mood-filter.md)

## What

`mood` is already stored on every drop and validated by `moodSchema`, but it
does nothing on the map. Make it visible and filterable:

- Pins tinted by mood (within the paper/ink/sage palette — tints, not rainbow).
- Filter chips on the map: show me only *regret*, only *joy*, etc.
- Feeds the mood-subscription notification setting in
  [13](13-settings-retention.md).

## Why

Cheapest legibility win available. The map currently reads as identical
anonymous pins; mood turns it into a mood map of a neighbourhood, which is both
prettier and a genuine reason to browse. Also lets people avoid heavy content
when they're not in the mood for it — a real retention factor in a confessions
app.

## Backend work

- `nearbyQuery` in `src/schemas/drop.schema.ts` gains
  `mood: moodSchema.optional()` (or a comma-separated list → `z.array`).
- One `AND mood = ANY($moods)` in the `nearby` query in `drop.repo.ts`.
- That's it. `mood` is already `NOT NULL` on `drops`.

## Client work

- `features/map/hooks/useNearbyDrops.ts` — pass the filter through; make it part
  of the React Query key so switching filters refetches cleanly.
- Filter chips on `MapScreen.tsx` — reuse the chip style already built in
  `features/drop/components/MoodChips.tsx` rather than inventing a second one.
- Mood → colour mapping belongs in `design-system/tokens` next to the palette,
  not inline in the map. Four moods only (`joy · ache · trouble · wonder`, fixed
  by the `drops_mood_chk` DB constraint), so it's a four-entry map. Keep every
  tint inside the existing paper/ink/sage range so the map still looks like the
  design.
- Persist the last filter in MMKV (`services/storage/keys.ts`).

## Risks / notes

- Keep the tint subtle. The design's whole identity is a muted paper map;
  saturated mood pins would wreck it.
- Filtering hides content, which interacts with the "you can only read what you
  walk to" promise — make it obviously a *view* filter, with a count of what's
  hidden.
