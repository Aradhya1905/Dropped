# 10 — City constellation

**Effort:** M · **Where:** mostly client · **Status:** built (device QA owed)
**Plan:** [2026-08-07-10-city-constellation.md](../.claude/plans/2026-08-07-10-city-constellation.md)

## What

Draw the places you've revealed as a connected constellation over a minimal map
of the city — each reveal a point, lines between them in walk order, rendered in
the paper/ink style. One per city. Exportable as an image.

## Why

- `deviceStats` already returns `citiesVisited`, and `drops` already carries
  `city` and `place_label`. The data is sitting there as a number; a number is
  not a keepsake.
- This is the app's shareable artifact. A screenshot of your city drawn out of
  the secrets you walked to is worth more marketing than any App Store copy, and
  it doesn't leak any secret content.
- Gives long-term users something that only time can produce.

## Backend work

Small. `citiesVisited` exists in `deviceStatsResponse`; what's missing is the
per-city breakdown:

- `GET /devices/me/cities` → `[{ city, foundCount, droppedCount, firstAt, lastAt }]`.
- **`city` isn't on the wire yet.** The column exists (`0001_drop_city.sql`) and
  `DropRow` carries it, but `toDrop()` in `src/services/mappers.ts` drops it, so
  `apiSecretSchema` never sees it. Add it to `dropSchema` in
  `src/schemas/common.schema.ts` + the mapper — shared with
  [11](11-wax-seal-collection.md).
- Optionally extend `/drops/trail/found` with a `city` filter so the constellation
  can page through one city's points. Coordinates for the user's *own* reveals
  are fine to return — they've already earned them.

## Client work

- New section on `TrailScreen.tsx`, or its own screen off the Trail tab.
- Render with `react-native-svg` (already a dependency) rather than a live map —
  it should look drawn, not surveyed. Points sized by `revealCount`, lines thin
  ink, `Caveat` labels from `place_label`.
- Export: render to an image and hand to the share sheet. Pairs with the postcard
  export in [15](15-settings-polish.md).
- Stacks visually with [01 fog of war](01-fog-of-war.md) — same Trail tab, same
  "map you made with your feet" idea. Build fog first; constellation is the
  keepsake version of it.

## Risks / notes

- **Never put secret bodies on the exported image.** Places and dates only.
- Consider offering the export without city labels for people who don't want to
  publish where they live.
