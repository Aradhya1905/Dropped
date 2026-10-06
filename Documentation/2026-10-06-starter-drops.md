# Dropped — Starter drops (never open to an empty map)

_2026-10-06_

A new user who opens the map and finds nothing within walking distance leaves
and doesn't come back. Starter drops fix the cold start without AI, map data or
a cron job (the backend is a free 1 GB / 1 core Oracle box). When a device
onboards into an **empty area**, the server pins a few shared drops around it.

Plan: [`.claude/plans/2026-10-06-starter-drops.md`](../.claude/plans/2026-10-06-starter-drops.md).
Backend commit: `83b6153` on `Dropped_Backend/main`, deployed 2026-10-06.

## How it behaves

```
first live GPS fix after onboarding (app, once per device)
  └─ POST /devices/me/starter-drops { coordinate }
       server, inside one advisory-locked transaction:
       ├─ device already used its attempt?                      → already-claimed
       ├─ any visible, unexpired drop within STARTER_CHECK_RADIUS_M?
       │                                                        → area-occupied
       └─ else pin 3 starters around the point                  → seeded
```

| Ring | Distance  | Purpose                                         |
| ---- | --------- | ----------------------------------------------- |
| near | 10–25 m   | Revealable on the spot — first wax-seal moment   |
| mid  | 150–250 m | A short walk                                     |
| far  | 400–600 m | A real walk                                      |

Bearings are spread ~120° apart (random base, ±20° jitter). Placement isn't
checked against water or roads; three directions make it likely at least one
is reachable.

**Rules**

- **The area check decides.** Two users onboarding 50 m apart get one set:
  the second finds the first set's starters inside the radius and nothing new
  is seeded. Starters count toward the check like any other drop.
- **Shared and public.** Starters are normal visible drops: everyone sees them
  in nearby, and anyone can reveal, save, heart or report them.
- **Honest.** They're authored by a system device
  (`00000000-0000-4000-8000-000000000001`), labelled
  `placeLabel: "A starter drop"`, flagged `starter: true` on the wire, and
  written as invitations rather than fake confessions.
- **They expire** after `STARTER_DROP_TTL_DAYS`, so real drops take over. An
  expired drop leaves nearby and can't be revealed, except by a device that
  already revealed it (it stays in that device's Found trail). If an area is
  left with only expired drops, it counts as empty again and the next new user
  there seeds a fresh set.
- **One attempt per device**, whether or not anything was seeded. This stops
  someone spoofing GPS around a city to carpet it with starters. The device id
  comes from `ANDROID_ID`/IDFV, so a reinstall doesn't reset it.
- **No double-seed race.** The check and the insert run under
  `pg_advisory_xact_lock(hashtext('starter-seed'))`, which serialises all
  seeding (rare, so the cost is nothing).
- Starters skip moderation (our own text) and never count against anyone's
  daily drop quota.

## Configuration (backend `.env`, restart to apply)

| Var                      | Default | Meaning                                         |
| ------------------------ | ------- | ----------------------------------------------- |
| `STARTER_DROPS_ENABLED`  | `true`  | Kill switch; no app release needed              |
| `STARTER_CHECK_RADIUS_M` | `1000`  | Seed only if no drops exist within this radius  |
| `STARTER_DROP_TTL_DAYS`  | `30`    | Lifetime of a starter drop                      |

The ring distances are the `RINGS` constant at the top of
`src/services/starter.service.ts`. The texts (30 of them, across all four
moods) live in `src/domain/starterPool.ts`. Edit them freely, but keep each
one ≤ 280 chars; a test enforces this.

## API

`POST /devices/me/starter-drops`. Body `{ coordinate: { lat, lng } }`.

- **200** → `{ seeded: boolean, outcome: 'seeded' | 'area-occupied' | 'already-claimed' | 'disabled' }`
- **429** → more than 5 calls/hour from one device (route-level limit, on top
  of the global 120/min)

`ApiSecret` gains `starter?: boolean`. `/drops/nearby` and
`/drops/{id}/reveal` now honour `expires_at`. Full reference:
`Dropped_Backend/Documentation/API.md`.

## Backend changes (`C:\My_Projects\Dropped_Backend`)

| File | Change |
| ---- | ------ |
| `drizzle/0010_starter_drops.sql` | Adds `devices.starter_claimed_at`. `drops.expires_at` + `drops_expires_idx` use `IF NOT EXISTS` (they already exist in the live DB from the abandoned `0005`). Numbered `0010` because `0004`–`0009` are taken in `_migrations`. |
| `src/db/schema.ts` | Mirrors both columns |
| `src/config/env.ts`, `.env.example` | The three `STARTER_*` vars |
| `src/domain/destination.ts` | `destinationPoint(origin, bearing, meters)`: forward geodesic step. Kept out of `geo.ts`, which is a verbatim copy of the client's file. |
| `src/domain/starterPool.ts` | `STARTER_DEVICE_ID`, `STARTER_PLACE_LABEL`, the text pool |
| `src/services/starter.service.ts` | `pickTexts` (distinct moods first), `planStarters` (pure placement), `starterService.seed` |
| `src/repositories/starter.repo.ts` | `claimAndSeed`: lock, claim, area check, insert, all in one transaction |
| `src/repositories/device.repo.ts` | `claimStarter` (atomic `UPDATE … WHERE starter_claimed_at IS NULL`), `ensureTx` |
| `src/repositories/drop.repo.ts` | `create` accepts `expiresAt` and an optional transaction; `starter` column derived as `device_id = STARTER_DEVICE_ID`; expiry filter in `nearby` and `distanceFrom` (the latter now takes `deviceId`); new `hasDropsWithin` |
| `src/services/reveal.service.ts` | Passes `deviceId` to `distanceFrom` |
| `src/routes/devices.routes.ts`, `src/controllers/device.controller.ts`, `src/schemas/*.ts`, `src/services/mappers.ts`, `src/domain/clientTypes.ts` | Route, schemas, `starter` on the wire |
| `tests/starterPlan.spec.ts` | Placement and text logic (pure) |
| `tests/starterSeed.spec.ts` | End-to-end against PostGIS: empty area → 3; second device 50 m away → none, sees the same 3; one attempt per device; expiry hides and blocks reveal but keeps revealed copies; concurrent onboarding → one set |
| `Documentation/API.md`, `tables.md`, `CLAUDE.md` | Endpoint, columns, "next migration is `0011`" |

Gotcha: postgres.js couldn't serialise a `Date` for the nullable
`expires_at` parameter, so `create` sends `toISOString()` with a
`::timestamptz` cast.

## App changes (this repo)

| File | Change |
| ---- | ------ |
| `src/types/index.ts` | `Secret.starter?: boolean` |
| `src/services/api/index.ts` | `ApiSecret.starter`, `ApiStarterDropsResult`, `postStarterDrops(coordinate)` |
| `src/services/api/mappers.ts` | Passes `starter` through |
| `src/services/storage/keys.ts`, `index.ts` | `onboarding.starterRequested` flag, plus `getStarterRequested` / `setStarterRequested` |
| `src/features/map/api/starterDrops.ts` | `requestStarterDropsOnce(coord)`: skips if the flag is set; shares one in-flight request; sets the flag on any successful response; on failure leaves the flag unset and rejects |
| `src/features/map/hooks/useStarterDrops.ts` | Fires once per mount on the first **live** fix (never the persisted last-known coordinate). On `seeded` it invalidates `['drops', 'nearby']` so the pins appear immediately. |
| `src/features/map/screens/MapScreen.tsx` | Calls `useStarterDrops()` |
| `src/features/map/api/starterDrops.test.ts` | Flag, de-dupe, retry-on-failure |

**Why `MapScreen`, not the onboarding `LocationScreen`:** `LocationScreen`
navigates to Main as soon as permission is granted, before the first fix
arrives. Mounting on the map also covers users who tapped "Not now" and grant
location later.

**No UI change was needed.** `placeLabel: "A starter drop"` already renders
wherever a place name does (pin label, range card, detail, opening, secret,
Trail). A later follow-up could use `secret.starter` to add a subtle "left by
Dropped" stamp.

Existing installs also make the call once after updating. They only get
starters if their area is empty, which is the point.

## Testing on a device

1. Rebuild (`yarn android`) and set a mock location to a spot with no drops
   within 1 km.
2. Open the map: 3 "A starter drop" pins, the nearest inside the 50 m range
   card, and the reveal works.
3. A second device mocked ~50 m away gets no new pins and sees the same 3.

To re-test with the same device (`ANDROID_ID` survives reinstall):

```sql
UPDATE devices SET starter_claimed_at = NULL WHERE id = '<device id>';
-- optionally remove the seeded set:
DELETE FROM drops
WHERE device_id = '00000000-0000-4000-8000-000000000001'
  AND ST_DWithin(geog, ST_SetSRID(ST_MakePoint(<lng>, <lat>), 4326)::geography, 2000);
```

Then clear the app's data (Settings → Apps → Dropped → Clear storage) to reset
the local flag.

## Not done / out of scope

- Land-use or water checks for placement (no free, reliable data).
- Cleanup of expired rows. The filter hides them, and the volume is trivial.
- A "left by Dropped" stamp in the UI.
- Grid-snapping real drops for author privacy (separate change; drops are
  still snapped to 5 dp ≈ 1 m).
