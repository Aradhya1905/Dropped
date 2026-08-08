# 18 — The empty map speaks

**Effort:** M · **Where:** backend + client · **Status:** planned
**Plan:** [2026-08-08-18-the-empty-map-speaks.md](../.claude/plans/2026-08-08-18-the-empty-map-speaks.md)

## What

When there is nothing within reach, the map stops being blank. It says which way
the nearest secret is and how far — *"nearest secret · 3.2 km · northeast"* —
and offers the other honest answer: **be the first one here.**

## Why

This is a first-run bug wearing the costume of a missing feature.

`MapScreen.tsx:302` renders `nearestInRange ? <RangeCard/> : echo ? <EchoCard/>
: null`. The mood-filter line only renders when a filter is on. So a user with
no drops inside `useNearbyDrops`' 2 km radius (`useNearbyDrops.ts:49`) sees a
map, their own dot, fog, and **nothing else at all**. No copy, no card, no
direction, no suggestion.

- That is every single user outside a city somebody seeded by hand. It is
  also the state the app will be in for most of its first year in most places.
- A map with no pins and a map that failed to load are already treated as
  different things here — there is a careful comment at `MapScreen.tsx:214`
  about exactly that distinction, and an offline banner built for it. The third
  state, *"we asked and the world is genuinely empty here"*, was never given a
  voice.
- "Be the first" converts the dead end into the one action that is always
  available and always in-character. A user who drops on day one has something
  to come back to, which is [17](17-someone-stood-here.md)'s whole premise.
- A bearing and a distance are a **reason to walk**, which is the product. Even
  3 km away, knowing there is *something* is categorically different from
  suspecting there is nothing.

## Backend work (`C:\My_Projects\Dropped_Backend`)

- **`GET /drops/nearest?lat&lng`** → `{ distanceMeters, bearingDeg, city }` or
  `{ nearest: null }`.
  - `ORDER BY d.geog <-> point LIMIT 1` — a KNN index scan on the existing
    `drops_geog_gix`, no new index.
  - `ST_Distance` for the metres, `ST_Azimuth` for the bearing.
  - Same visibility predicates as `nearby`: `status = 'visible'`, not expired.
  - **Returns no id and no coordinate.** Distance + bearing from a point the
    caller already supplied is strictly less than `nearby` gives away within
    2 km, and without an id there is nothing to reveal, preview, or report
    against.
  - **Quantise before answering**: round distance to a sane step (100 m under
    5 km, 1 km beyond) and the bearing to a compass point. Exact numbers from
    three query points trilaterate a confession to a doorstep; rounded ones
    do not. This is the security-relevant line in the ticket.
  - Cap the search (`NEAREST_MAX_RADIUS_M`, default ~50 km) so an empty region
    answers `null` fast rather than scanning a continent.
  - Per-route rate limit keyed on **IP**, like `/drops/:id/preview` — a device
    id is self-asserted and an enumerating client rotates it for free.

## Client work

- `EmptyCard` in `features/map/components`, a sibling of `RangeCard` and
  `EchoCard` with the same taped-paper construction, slotted into the same
  one-card-at-a-time chain in `MapScreen`. Precedence: something openable in
  range > an echo > empty.
- `useNearestDrop(coord)` — react-query, enabled **only** when the nearby query
  has resolved with zero secrets and no filter is on. One request per coarse
  cell per session; snap the key like `nearbyQueryKey` does.
- Copy has three states and they must not be confused:
  - nothing within 2 km, something further → distance + compass point + "or be
    the first here";
  - nothing anywhere in range of the cap → "nobody has left anything here yet"
    + "be the first";
  - the nearby request **failed** → the existing offline banner, unchanged.
    Never let a network error render as an empty world.
- The card's primary action opens the Composer.

## Risks / notes

- **Do not point at a specific drop.** The temptation is a compass needle
  straight to it; that is a treasure map to one coordinate and turns the 50 m
  rule into a formality. Coarse bearing only, no id, no follow-up query that
  narrows it.
- Rounding is load-bearing, not polish. Unrounded distance from multiple points
  is trilateration.
- Interacts with [12](../FUN_TODOs/12-lying-compass.md): that ticket deliberately
  makes the compass imprecise. Same instinct, same reason — keep them
  consistent, and reuse its wording if it fits.
- Guard against the card flashing during the first fix. `MapScreen` already
  returns `<MapLoader/>` while `coord == null`; the empty card must also wait
  for the first *nearby* response, not just the first GPS fix.
