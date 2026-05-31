# Dropped — Architecture

_2026-05-31_

## What it is
Anonymous, no-login app. People pin secret confessions/stories to a real GPS
coordinate. Others can only read a secret after physically walking **within
50 m** of where it was dropped — then the app does a **reveal**.

> PostSecret × geocaching × Pokémon Go, minus the Pokémon.
> Design voice: serif wordmark "Dropped", mono tagline "SECRETS, WHERE THEY HAPPENED", warm-paper + moss palette.

Core loop: **drop → walk → reveal**.

## Stack
- **Bare React Native 0.85.3 / React 19** (not Expo).
- TypeScript, path-based `src/` layout.
- Deferred (installed per-feature, not yet): React Navigation, a map provider,
  Zustand (state), React Query (data), geolocation + local notifications.

## Folder map
```
src/
  app/            app shell — providers + navigation
  design-system/  "Dropped" UI kit: tokens · components · icons
  features/       one folder per domain section (drop→walk→reveal loop)
    onboarding/   intro slides + location/notification permission priming
    map/          city map with hidden secret pins
    nearby/       list/compass of secrets near you ("getting warmer" distance)
    drop/         compose a secret + pin it to a location
    reveal/       the within-50 m unlock + reveal animation
    settings/     about, anon prefs, permission re-prompt
  services/       cross-cutting integrations behind adapters
    api/          HTTP client + interceptors
    storage/      MMKV/AsyncStorage (anon device id, seen-secrets cache)
    maps/         provider-agnostic MapAdapter (noop stub until provider chosen)
    location/     GPS watch + distance-to-drop + within-50 m logic
    notifications/ local push when near an undiscovered secret
    analytics/
  store/          global Zustand stores (anon session, activeDrop, discovered)
  utils/          geo (haversine/isWithin), format, validators
  types/          shared domain types: Coordinate, Drop, Secret, RevealState
```
Each `features/*` contains `screens/ · components/ · hooks/ · api/ · types.ts`.

## Remap from the reference (ride-hail) project
| Reference | Dropped | Why |
|---|---|---|
| `auth/` | removed | anonymous, no login |
| `request/ matching/ payment/` | `drop/ map/ nearby/ reveal/` | the drop→walk→reveal loop |
| `services/payments otp` | `services/location notifications` | GPS + proximity are the product |
| `i18n/` | omitted (add later) | not needed yet |
| `maps/` (Mappls) | `maps/` agnostic stub | provider chosen later |

## Seeded (real, not placeholder)
- `design-system/tokens/*` — colors (`ink #211D18`, `moss #566E5B`), type, spacing, radii.
- `types/index.ts` — `Coordinate`, `Drop`, `Secret`, `RevealState`, `REVEAL_RADIUS_M = 50`.
- `utils/geo.ts` — `haversineMeters`, `isWithin` (50 m default).
- `services/maps/` — `MapAdapter` interface + `noopAdapter`.

Everything else is a compile-clean barrel + README so the tree self-documents.

## Conventions
- Features never import a vendor SDK directly — go through a `services/*` adapter.
- `design-reference/` holds the read-only design export (HTML). Don't edit it.
- Root `App.tsx` stays the template until `src/app/App.tsx` (providers + nav) is wired.
