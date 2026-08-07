# 09 — Time / condition gated drops

**Effort:** M · **Where:** backend + client · **Status:** todo
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
