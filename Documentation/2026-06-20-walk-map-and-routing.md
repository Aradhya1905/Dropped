# Walk screen — real map + server-proxied walking route

_2026-06-20_

Two fixes to the "walk a secret into range" flow, plus one small bug on the
sealed-secret sheet.

## 1. Heading label bug (SecretDetailScreen — screen 05)

The "X min walk · **heading WEST**" line was derived from `useCompassHeading()`
— the magnetometer direction the **phone is pointing** — so the cardinal flipped
as you rotated the phone in place, even though the drop sits in a fixed
real-world direction. It now uses the **bearing from you → the drop**
(`bearingTo`, pure GPS), so it tells you which way to walk and no longer depends
on the magnetometer. The compass needle still spins with the phone.

- One line in [src/features/nearby/screens/SecretDetailScreen.tsx](../src/features/nearby/screens/SecretDetailScreen.tsx)
  (`cardinal` now from `dropBearing`, not `deviceHeading`).
- Distance (`328 m`), walk-time (`distance / 80`), address, date, and "found"
  on that sheet were already live — only the heading was wrong.

## 2. Walk screen was a fake illustration → now a real map

`WalkSequenceScreen` (the screen behind **"Walk here to unlock"**, design beats
04a/b/c) was a **100% decorative drawing**: every element — the curved route,
footsteps, 50 m ring, "walking" dot, secret pin — was drawn at fixed design-space
coordinates (`346×780`) on blank paper. Nothing was geographic; only the
headline distance and the approach/range/arrived beat were real. So there was
**no map** and the positions were meaningless.

It now renders over a **real MapLibre map** (same adapter/style as the main Map
screen):

- **Live user dot** ([UserDot](../src/features/map/components/UserDot.tsx)) and
  the wax **secret pin** at their true GPS coordinates.
- A **geographic 50 m unlock ring** — a real polygon (`circlePolygon`) drawn with
  `GeoJSONSource` + fill/line `Layer`s, opacity tuned per beat.
- A **street-following walking path** + footsteps from you to the secret (see
  §3). When no route is available it simply isn't drawn — map, dot, pin, and ring
  still show.
- Camera **fits both** you and the secret on open and re-frames on each beat
  change ("fit both, then follow"), plus a recenter button.
- The top status chip ([MapStatus](../src/features/map/components/MapStatus.tsx))
  and bottom [FindCard](../src/features/map/components/FindCard.tsx), and the
  GPS-driven beats, are unchanged.

**Firm rules kept:** the 50 m reveal is still straight-line haversine, and the
big headline distance is still haversine — the route only drives the drawn path
and (optionally) a real walk-time. A road-distance headline could read "180 m"
for a drop 40 m away through a wall and never feel "in range".

Files:
- Rewrite: [src/features/map/screens/WalkSequenceScreen.tsx](../src/features/map/screens/WalkSequenceScreen.tsx)
  (old fixed-coordinate helpers / `RouteLine` removed).
- Geo math: `circlePolygon` + `samplePointsAlongLine` in
  [src/utils/geo.ts](../src/utils/geo.ts).
- Camera: `fitBounds` added to the map adapter
  ([src/services/maps/maplibreAdapter.tsx](../src/services/maps/maplibreAdapter.tsx))
  and the `MapAdapter` interface ([types.ts](../src/services/maps/types.ts) +
  [noopAdapter.ts](../src/services/maps/noopAdapter.ts)).

## 3. Walking route — proxied through the backend

The path follows real streets via a routing provider, but the client never calls
it directly: it goes through **our backend** so the API keys stay server-side and
the provider/quota are controlled centrally. The backend tries **OpenRouteService**
(`foot-walking`) first, falls back to **Mapbox** (`walking`), and returns
`{ available: false }` when both are spent — then the client draws nothing.

Client side:
- `fetchFootRoute(from, to)` → `GET /route/foot` in
  [src/services/api/index.ts](../src/services/api/index.ts).
- Hook [src/features/map/hooks/useFootRoute.ts](../src/features/map/hooks/useFootRoute.ts)
  — react-query keyed on the **quantized origin** (~30 m grid) so GPS jitter
  doesn't refire the request; long `staleTime`.

Backend details (endpoint, tables, providers, ops) live in the backend repo:
`Dropped_Backend/Documentation/2026-06-20-route-foot-endpoint.md`. Short version:
quantize → Postgres cache (`route_cache`) → ORS → Mapbox → none, with a
per-provider monthly counter (`routing_usage`) under the free tiers. Keys
(`ORS_API_KEY`, `MAPBOX_TOKEN`) are in the server `.env`.

## Status

- **Backend: deployed and live** at `https://droppeddev.duckdns.org/route/foot`.
  Migration `0003_routing.sql` applied; verified returning a real ORS route
  (608 m / 438 s) and serving repeats from cache.
- **Frontend: code complete, not yet committed** on branch
  `Dropped_Navigation_Fixes`. No native rebuild needed — MapLibre is already
  installed; `yarn android` picks it up.

## Verify on device

Open a drop → **Walk here to unlock**: a real map shows your dot, the secret
pin, the dashed 50 m ring, and a **street-following dashed path with footsteps**
to the secret; the camera frames both. Walk toward it — the headline distance
counts down, beats advance approach → range → arrived from real GPS, and
"Break the seal" appears within 50 m (haversine), unaffected by the route.
Turn on airplane mode (or exhaust the server quota) → the path/footsteps vanish
but the map, dot, pin, and ring still render.
