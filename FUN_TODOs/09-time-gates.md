# 09 — Time / condition gated drops

**Effort:** M · **Where:** backend + client · **Status:** built (migration + device QA owed)
**Plan:** [2026-08-07-09-time-gates.md](../.claude/plans/2026-08-07-09-time-gates.md)

## What

An author can add a second condition on top of the 50 m rule:

- **After dark** — readable only between sunset and sunrise at that location.
- **Daytime only.**
- Later, optionally: **when it's raining** (needs a weather source).

Standing in the right place at the wrong time shows the pin and a hint of the
condition, not the secret.

## Why

Doubles the meaning of a coordinate: the same bench holds a different mood at
2 a.m. than at noon, and gating makes the app say so. It also produces the best
version of a "come back later" mechanic — one that isn't an artificial timer but
a property of the world.

## Backend work

- **Migration** — add to `drops`:
  ```sql
  ALTER TABLE drops ADD COLUMN reveal_condition text; -- null | 'night' | 'day'
  ```
- **Enforcement in `reveal.service.ts`**, right next to the 50 m check — same
  place, same principle: the server is the source of truth, the client is never
  trusted. Compute local sunrise/sunset from the drop's own `geog` and the server
  clock (a small solar-position calc, no external API needed for day/night).
- Failed reveal returns the existing error shape with the reason, the way a
  too-far reveal already returns `distanceMeters`.
- `nearby` returns `revealCondition` so the client can show the hint.
- Weather conditions, if ever: needs an external API call keyed by coordinate —
  put it behind a service in `src/services/` and cache aggressively. Treat as a
  separate, later ticket.

## Client work

- Composer: an optional condition chip, default none.
- Pin/detail shows the condition as part of the seal — "waits for dark".
- Walk screen: if you're inside 50 m but outside the window, say so warmly rather
  than erroring.

## Risks / notes

- Don't stack too many gates. 50 m is already a hard ask; 50 m *and* midnight
  *and* rain means nobody ever reads it. Cap at one condition per drop.
- Timezone/DST correctness matters — compute from coordinate, never from the
  client's clock or the server's local timezone.

## What actually shipped

Branch `feat/09-time-gates` in both repos. Four deliberate departures from the
plan, all narrowing rather than widening it:

- **`conditionMet` lives in `src/domain/solar.ts`, not `reveal.service.ts`.**
  The service imports `drop.repo`, which imports the Postgres client, so a
  predicate exported from there could not be unit-tested without a database.
  Putting it beside the arithmetic mirrors `domain/expiry.isExpired` sitting
  apart from the SQL that enforces expiry.
- **The gate uses solar *altitude*, not a comparison against sunrise/sunset.**
  `isNightAt` asks where the sun is at one instant, so there is no "which day"
  to get wrong near the date line, and the polar cases need no special case —
  at Tromsø in June the altitude simply never goes negative. `sunTimes` still
  solves for the crossings, but only to write "opens in about 4 hours".
- **`dropRepo.distanceFrom` became `dropRepo.revealGate`.** It now also returns
  the drop's own coordinate and its `revealCondition`, so the gate runs off one
  query and cannot be handed the walker's point by accident.
- **Migration is `0008_reveal_condition.sql`, not 0007.** The anniversary-echo
  work (08) has 0007 in flight. The migrator keys off filenames in a
  `_migrations` table, so a gap is harmless; a duplicate number would not be.

The client deliberately does **not** duplicate the solar math. It shows the
condition before the walk (pin tag, detail line, walk cards) and renders the
server's 403 — `revealCondition` + `opensAt` — as an invitation rather than an
error. One source of truth for *whether*, the server; the client only phrases it.

**Owed:** run `yarn db:migrate` against the dev database, then
`tests/conditionGate.spec.ts` (it plants one drop where it is currently local
midnight and another where it is local noon, so it is deterministic at any hour
without a fake clock). Device QA per the plan after that.
