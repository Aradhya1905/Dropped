# FUN_TODOs

Ideas to make **Dropped** genuinely more fun and more sticky. Not bugs, not
plumbing — features. Each file is one idea, sized as a ticket: what it is, why it
matters, exact client + backend deltas, effort, risks.

Backend lives at `C:\My_Projects\Dropped_Backend` (Fastify + Postgres/PostGIS +
Drizzle). Both repos are further along than `Documentation/2026-06-13-remaining-work.md`
claims — nearby / reveal / save / heart / report / trail / steps / foot-route are
all wired end to end.

> Implementation plans are written for all 16 — dated files in `.claude/plans/`,
> linked from the Plan column below and from each ticket's header. Each plan
> carries ordered steps, the existing code to reuse, and a Unit / Device QA /
> Acceptance test section. Update the plan as you go rather than re-planning.

## Index

| # | Idea | Where the work is | Effort | Status | Plan |
|---|------|-------------------|--------|--------|------|
| [01](01-fog-of-war.md) | Fog of war map | client only | M | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-01-fog-of-war.md) |
| [02](02-warmth-haptics.md) | Warmth haptics on approach | client only | S | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-02-warmth-haptics.md) |
| [03](03-replies-in-place.md) | Replies in place | backend + client | L | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-03-replies-in-place.md) |
| [04](04-expiring-drops.md) | Expiring drops | backend + client | S | **built** (visual device QA owed) | [plan](../.claude/plans/2026-08-07-04-expiring-drops.md) |
| [05](05-whisper-tier.md) | Whisper tier (three-stage reveal) | backend + client | M | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-05-whisper-tier.md) |
| [06](06-mood-filter.md) | Mood filter + mood-tinted pins | backend + client | S | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-06-mood-filter.md) |
| [07](07-share-a-spot.md) | Share-a-spot deep link | backend + client | M | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-07-share-a-spot.md) |
| [08](08-anniversary-echo.md) | Anniversary echo | backend + client | M | **built** (in-app half; device QA owed) | [plan](../.claude/plans/2026-08-07-08-anniversary-echo.md) |
| [09](09-time-gates.md) | Time / condition gated drops | backend + client | M | **built** (migration + device QA owed) | [plan](../.claude/plans/2026-08-07-09-time-gates.md) |
| [10](10-city-constellation.md) | City constellation | mostly client | M | todo | [plan](../.claude/plans/2026-08-07-10-city-constellation.md) |
| [11](11-wax-seal-collection.md) | Wax seal collection | client only | S | **built** (device QA owed) | [plan](../.claude/plans/2026-08-07-11-wax-seal-collection.md) |
| [12](12-lying-compass.md) | Lying compass | client only | S | todo | [plan](../.claude/plans/2026-08-07-12-lying-compass.md) |
| [13](13-settings-retention.md) | Settings: retention levers | client + small backend | M | todo | [plan](../.claude/plans/2026-08-07-13-settings-retention.md) |
| [14](14-settings-trust.md) | Settings: trust & privacy | client + backend | M | todo | [plan](../.claude/plans/2026-08-07-14-settings-trust.md) |
| [15](15-settings-polish.md) | Settings: polish & accessibility | client only | S | todo | [plan](../.claude/plans/2026-08-07-15-settings-polish.md) |
| [16](16-background-walk-engine.md) | Background walk engine (prerequisite) | client + native | L | todo | [plan](../.claude/plans/2026-08-07-16-background-walk-engine.md) |

Effort: **S** ≈ a day, **M** ≈ a few days, **L** ≈ a week+.

## Read 16 before 02 / 08 / 13

`services/notifications` has a working notifee adapter and **zero call sites**;
the GPS watch only runs while the app is foregrounded. So the app cannot notice
anything while it's in your pocket — three ideas here quietly assume it can.
[16](16-background-walk-engine.md) is that missing piece, and each of 02/08/13
now says which half of itself works without it.

## Suggested order

1. **01 Fog of war** + **02 Warmth haptics** (screen-on half) — client-only, zero
   API risk, and they're what make *walking* feel like a game instead of a
   loading screen.
2. **03 Replies in place** — the retention feature. Turns a drop from a dead
   letter into a place with history.
3. **04 Expiring drops** + **05 Whisper tier** — two small schema/param deltas,
   large change in how the map feels.
4. **14 Trust settings** — home privacy zone + panic wipe are what make an
   anonymous location app trustworthy enough to keep installed, and `DELETE
   /devices/me` is a store-listing requirement regardless.
5. **16 Background walk engine**, then **13 Retention settings** — in that order.
   The levers are worthless before the machine, and 16 shouldn't ship before 14's
   mitigations exist.
6. Everything else opportunistically.

## Deliberately NOT doing

- **Photos / media.** House rules say "No photos. Just words." Also means
  `react-native-vision-camera` should probably be removed rather than wired up —
  it's installed but has no import anywhere in `src/`, and `AndroidManifest.xml`
  declares no `CAMERA` permission, so it's pure app-size cost today.
- **Consecutive-day streaks.** Forces walks, feels like a chore, punishes anyone
  sick or busy. `deviceStats.streakDays` already exists — prefer surfacing
  *distinct places visited* instead (see [10](10-city-constellation.md)).
- **Leaderboards / karma scores.** Anonymous + scored = gaming and cruelty. The
  brief says moderation is the hard problem; don't hand it a scoreboard.
- **Drifting / migrating drops.** Cute, but breaks the one promise the app
  makes: this happened *here*.
