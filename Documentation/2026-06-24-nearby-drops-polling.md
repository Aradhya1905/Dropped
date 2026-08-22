# Nearby drops — removed the every-minute poll

_2026-06-24_

`useNearbyDrops` was re-running `GET /drops/nearby` every 60 seconds while the
Map screen was mounted, even when the user stood still. Spotted in Reactotron as
a steady `API RESPONSE (200) GET /drops/nearby` tick once a minute. That's GPS +
network + battery cost for data that isn't time-sensitive (confessions don't
expire), so the time-based poll was removed.

## What changed

[src/features/map/hooks/useNearbyDrops.ts](../src/features/map/hooks/useNearbyDrops.ts)
— dropped `refetchInterval: 60_000` from the `useQuery` options. `staleTime:
30_000` is kept.

## New refetch behavior

The query still refreshes, just on meaningful triggers instead of a clock:

- **On screen focus** — React Query's default refetch-on-mount/focus.
- **On movement** — the query key is the **snapped ~33 m grid cell**
  (`GRID_DEG = 0.0003°`, `snap = Math.round(n / GRID_DEG)`), so when the user
  walks far enough to cross into a new cell the key changes and react-query
  fetches for the new location. Standing still keeps the same cell → no refetch.
- **Cache reuse** — `staleTime: 30_000` means a quick re-focus within 30 s reuses
  the cached result instead of hitting the network.

The grid-snap is the same jitter-guard pattern used by
[useFootRoute.ts](../src/features/map/hooks/useFootRoute.ts) (see
[2026-06-20-walk-map-and-routing.md](2026-06-20-walk-map-and-routing.md) §3): the
2 km server radius is far larger than a grid cell, so snapping never changes
which drops come back — it only stops normal GPS wobble from churning the markers.

## Why not just slow the interval

Slowing it (e.g. 5 min) was considered but the cleanest fit for this app is no
idle polling at all: the natural "show me what's near me now" trigger is the user
*moving*, which the grid-cell key already covers, plus a focus refresh. A timer
adds battery/network cost without a real freshness need.
