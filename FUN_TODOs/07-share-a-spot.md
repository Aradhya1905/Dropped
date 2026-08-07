# 07 — Share-a-spot deep link

**Effort:** M · **Where:** backend + client · **Status:** **built** (device QA owed)
**Plan:** [2026-08-07-07-share-a-spot.md](../.claude/plans/2026-08-07-07-share-a-spot.md)

## What

Share a link to a *place*, not a secret: `dropped://d/<uuid>` plus an https
fallback. Opening it drops you on the walk screen aimed at that coordinate. The
link never contains the body — the recipient still has to walk there.

## Why

The only real growth loop in this folder. Everything else deepens engagement for
people already installed; this is the one thing that puts the app in front of
someone else, and it does it in the app's own language: "there's something here,
go stand on it."

## Backend work

- `GET /drops/:id/preview` — **public metadata only**:
  `{ placeLabel, city, mood, createdAt, revealCount }`. **Never the body, never
  the exact coordinate at full precision** — return a coarsened point (round to
  ~3 decimal places, ≈100 m) so a link can't be used to pinpoint someone's
  drop-off without walking.
- Respect `status`: 404 for `hidden`/`pending`, and for expired drops once
  [04](04-expiring-drops.md) lands.
- Rate-limit it — it's the only unauthenticated-ish surface besides `/health`,
  so it's the one an abuser would scrape.
- Optional: a minimal server-rendered OG page for the https fallback, so the
  link previews nicely in a chat app. Text only, no body content.

## Client work

- Deep linking config in `app/navigation` (React Navigation v7 `linking`), route
  → `SecretDetail` / `Walk` with the drop id.
- Share sheet from `SecretScreen.tsx` and `DroppedScreen.tsx` — "someone should
  stand here".
- Cold-start handling: link opened before onboarding is complete should finish
  onboarding first, then land on the spot.
- Android intent filter + iOS associated domains if using the https form.

## Risks / notes

- **Coordinate precision is the risk.** A shareable exact coordinate plus a
  confession is a deanonymisation vector. Coarsen server-side; do not rely on the
  client to round.
- Consider whether authors should be able to opt a drop *out* of being
  shareable. A confession you meant for strangers passing by is different from
  one you're happy to have broadcast in a group chat.

## What shipped

Branch `feat/07-share-a-spot` in both repos. See the
[plan](../.claude/plans/2026-08-07-07-share-a-spot.md) for the full status
section, including where the build deviates from what was planned.

- `GET /drops/:id/preview` — id, mood, place, city, revealCount, expiry, and a
  coordinate **coarsened to 3 dp (~100 m) server-side**. No `body` field exists
  in the response schema at all, and the row the query selects has no body
  column in it either. IP-keyed rate limit of 20/min.
- 404 — identical message and status — for hidden, pending, expired, opted-out,
  and nonexistent drops.
- The author opt-out was built: migration 0006 adds `shareable` (default true),
  the composer has a toggle, and the share affordance hides for a drop whose
  author declined. It gates the *link* only — an opted-out drop is still found
  by walking past it.
- `dropped://d/<uuid>` on Android and iOS. A cold-start link finishes onboarding
  first, then lands on the spot with the map underneath so back doesn't strand
  anyone.
- Share sheets on the reveal screen and the just-dropped screen.

**Deferred:** the https/App Links form (needs a real domain plus a
non-placeholder iOS bundle id) and the server-rendered OG page. `parseSpotLink`
already accepts the https shape, so enabling it is one constant plus the native
entries.

**Owed:** device QA (nothing has been run on a handset), and the iOS
`openURL` forwarding in `AppDelegate.swift` is unverified — it was written on a
Windows machine and never compiled.
