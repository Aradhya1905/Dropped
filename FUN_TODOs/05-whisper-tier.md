# 05 — Whisper tier (three-stage reveal)

**Effort:** M · **Where:** backend + client · **Status:** built — device QA owed
**Plan:** [2026-08-07-05-whisper-tier.md](../.claude/plans/2026-08-07-05-whisper-tier.md)
(the plan's "As built" section records where the shipped code differs from it)

## What

Stop treating a drop as binary sealed/open. Three bands:

| Distance | What you get |
|---|---|
| > 150 m | a pin, nothing else |
| 150–50 m | **whisper**: mood + the first word or two, nothing more |
| < 50 m | full reveal (unchanged, server-verified) |

## Why

- The 50 m rule is great but the approach is flat — you learn nothing until you
  arrive, so there's no pull.
- A whisper is a hook: "regret · *I never told…*" is exactly the thing that makes
  someone walk the last two blocks.
- Cheap to build. `nearby` already computes distance server-side.

## Backend work

- `nearby` in `drop.repo.ts` already returns `ST_Distance`. Add a `whisper` field
  to `apiSecretSchema`, populated **server-side only** when the requesting point
  is inside the whisper band:
  - `whisper: { mood, teaser }` where `teaser` is the first N chars of `body`
    truncated at a word boundary (N ≈ 18), or `null`.
- **Never send the full body outside the 50 m reveal.** The teaser must be
  computed in SQL/service, not by shipping the body and letting the client
  truncate — that would hand the whole secret to anyone reading the response.
- Carry it through `toSealedSecret` in `src/services/mappers.ts` — that's the one
  place that owns the sealed wire shape, and the teaser must never leak into
  `toUnsealedSecret`'s path by accident.
- **`WHISPER_RADIUS_M` belongs in `src/config/env.ts`** (default 150), with the
  other tunables. Note that `REVEAL_RADIUS_M` is *not* a config value — it lives
  in `src/domain/clientTypes.ts` as a constant copied from the client, on
  purpose: 50 m is the product's one rule and shouldn't be env-tunable. Don't
  "put the whisper radius next to it"; that would leave it needing a deploy.
- The band fits inside the existing query: `NEARBY_DEFAULT_RADIUS_M` is 500 and
  `nearby` already returns `ST_Distance`, so no extra round-trip.
- Teasers should skip drops with `status != 'visible'`, same as the rest.

## Client work

- `features/map/hooks/useNearbyDrops.ts` — carry `whisper` through.
- Map pin renders the mood tint + teaser in Caveat when whispering; plain wax
  seal otherwise.
- `features/nearby/screens/SecretDetailScreen.tsx` (screen 05) is the natural
  home for the whisper state — it's already the "walk closer" screen.
- Pairs directly with [02 warmth haptics](02-warmth-haptics.md): the whisper
  appearing and the pulse quickening should happen at the same moment.

## Risks / notes

- Privacy: a teaser is still content leaving the 50 m gate. Keep N small, always
  cut at a word boundary, and consider suppressing teasers entirely for drops
  under moderation review (`status = 'pending'`).
- Don't let the teaser make the reveal feel redundant. If the first line gives
  away the confession, people stop walking. Cap it hard.
