# 19 — First-walk letter

**Effort:** M · **Where:** backend + client · **Status:** planned
**Plan:** [2026-08-08-19-first-walk-letter.md](../.claude/plans/2026-08-08-19-first-walk-letter.md)

## What

On first launch in an empty area, the app leaves **one** drop for you, roughly
100 m away, and says so plainly. Walking to it and breaking its seal is the
first thing a new user does — so the core loop happens in session one instead of
never.

It is signed by the app, not by a stranger. The wax seal is a different colour,
the author line says *Dropped*, and it is excluded from every count and every
stat. Exactly one per device, ever.

## Why

`drop → walk → reveal` requires somebody else's drop to already exist. In a city
with none, a new user can install the app, grant location, and discover that
there is nothing to do — the product cannot be experienced at all. No amount of
onboarding copy fixes a cold map; [18](18-the-empty-map-speaks.md) makes the
emptiness legible, but legible emptiness is still emptiness.

- Screens 02/03 (`HowItWorksScreen`) already *describe* the reveal with a mock
  `SecretNote`. This turns the description into the real thing, with real GPS,
  real distance, and the real seal-break animation.
- The reveal is the app's whole emotional payload. A user who has felt it once
  understands what a drop is *for* — and is far likelier to write one.
- It gives [11](../FUN_TODOs/11-wax-seal-collection.md) its first seal and
  [01](../FUN_TODOs/01-fog-of-war.md) its first cleared fog, both of which are
  empty-shelf features on day one.

## The honesty problem — decide this before building

This is the only ticket in either folder that puts content into the world that
no human walked anywhere to leave. Handled badly it is a fake user, and an
anonymous confessions app that quietly writes its own confessions has lost the
only thing it sells.

Handled well it is a **letter from the app**, which is an old and honest form.
The rules that make it the second thing and not the first:

- It is **visibly not a stranger.** Distinct seal colour, `Dropped` on the
  author line, distinct card treatment. A user must never wonder whether a
  person wrote it.
- **One per device, ever.** Not a stream, not a refill, not a "here's another".
- **It never enters the counts.** Excluded from `deviceStats`, from the
  constellation, from `foundTotal`, from the Trail's found list totals. Getting
  this wrong turns the stats into flattery.
- **It is never a confession.** It is about the place and the walk — an
  instruction and a welcome. Nothing that imitates the register of a real drop.
- It is skippable, dismissible, and reportable like anything else.

If that set of constraints cannot be met, do not build this ticket. Ship
[18](18-the-empty-map-speaks.md) and accept the cold start.

## Backend work (`C:\My_Projects\Dropped_Backend`)

- **Migration** `drizzle/0011_seeded_drops.sql` — `drops.origin text NOT NULL
  DEFAULT 'user'`, check constraint `origin IN ('user','app')`. A column, not a
  magic device id: every query that must exclude these needs to say so out loud,
  and a reviewer can grep for it.
- A `'__app__'` author row in `devices`, alongside the existing `'__deleted__'`
  sentinel and for the same reason — a non-UUID id the `X-Device-Id` plugin can
  never authenticate as.
- **`POST /drops/welcome`** → creates at most one `origin = 'app'` drop for the
  calling device, at a **server-chosen** offset (80–150 m, random bearing) from
  a coarse version of the supplied point, and returns it. Idempotent: a device
  that already has one gets the existing row.
  - Refuses if the area is not actually empty — if `nearby` at 1 km returns
    anything, the user has real drops to find and does not need this.
  - Body text comes from a **small fixed set** in the repo, not from a
    generator.
- **Exclusions** — audit every aggregate for `origin = 'user'`:
  `deviceStats` (`droppedTotal`, `foundTotal`, …), `/devices/me/cities`,
  `/drops/echoes`, `/drops/nearest` from [18](18-the-empty-map-speaks.md), and
  the trail totals. This audit is most of the ticket's real cost.

## Client work

- One call on first map load when `nearby` comes back empty and onboarding has
  just completed. Guarded by an MMKV flag (`welcomeDropId`) so it happens once
  per install regardless of what the server says.
- Distinct pin + seal treatment, and a distinct author line on
  `SecretScreen`.
- **Privacy zones bind this like everything else**: the coordinate sent to
  `/drops/welcome` goes through `isInsideAnyZone` first. Refuse rather than
  plant a drop 100 m from somebody's front door on their first day.

## Risks / notes

- **Nobody wants a second one.** Resist every future ticket that proposes
  refilling empty cities with app-authored content. This is a bridge across the
  first session, not a content strategy.
- Being planted 100 m away is fine in a park and unwalkable across a motorway.
  Offset from a coarse point, and accept that some users get one they cannot
  reach — the card should be dismissible, and being dismissed must count as
  "used" so a second is never planted.
- The `origin` column will be forgotten in some future aggregate. Add a test
  that fails when a new query omits it, not just a comment.
