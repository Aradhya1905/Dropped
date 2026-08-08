# RETURN_TODOs

Ideas that give someone a reason to open **Dropped** a second time.

[FUN_TODOs](../FUN_TODOs/README.md) is sixteen tickets about **the walk** — fog,
warmth, moods, compasses, seals, the background engine. All sixteen are built.
Between them they make the ten minutes a user spends walking to a pin feel like
something. None of them touch the two hours, or the two weeks, on either side of
that walk.

This folder is the other side:

- **After you drop, nothing happens.** `drops` already counts `reveal_count`,
  `stood_here`, `heart_count` and `reply_count`. Nothing in either repo ever
  tells the author. You write a confession, you get screen 09, and then the app
  is silent forever. [03](../FUN_TODOs/03-replies-in-place.md) built a path for
  readers to answer a drop — and the author still never learns a reply exists.
- **Before you find anything, nothing happens either.** With no drops in the
  2 km fetch radius the map renders your dot and nothing else — no card, no
  copy, no direction (`MapScreen.tsx:302`). That is every first user outside a
  city you personally seeded.
- **The first session cannot complete the core loop.** drop → walk → reveal
  needs somebody else's drop to already exist. In an empty city a new user
  physically cannot experience the product they installed.

Numbering continues from FUN_TODOs at **17** rather than restarting, so "18"
means one ticket in this repo and not two.

> Implementation plans are written for all 7 — dated files in `.claude/plans/`,
> linked from the Plan column below and from each ticket's header. Each plan
> carries ordered steps, the existing code to reuse, and a Unit / Device QA /
> Acceptance test section. Update the plan as you go rather than re-planning.

## Index

| # | Idea | Where the work is | Effort | Status | Plan |
|---|------|-------------------|--------|--------|------|
| [17](17-someone-stood-here.md) | Someone stood here (author loop) | backend + client | L | planned | [plan](../.claude/plans/2026-08-08-17-someone-stood-here.md) |
| [18](18-the-empty-map-speaks.md) | The empty map speaks | backend + client | M | planned | [plan](../.claude/plans/2026-08-08-18-the-empty-map-speaks.md) |
| [19](19-first-walk-letter.md) | First-walk letter | backend + client | M | planned | [plan](../.claude/plans/2026-08-08-19-first-walk-letter.md) |
| [20](20-offline-scrapbook.md) | Offline scrapbook | client only | S | planned | [plan](../.claude/plans/2026-08-08-20-offline-scrapbook.md) |
| [21](21-before-it-fades.md) | Before it fades | backend + client | S | planned | [plan](../.claude/plans/2026-08-08-21-before-it-fades.md) |
| [22](22-near-miss-ledger.md) | Near-miss ledger | client only | S | planned | [plan](../.claude/plans/2026-08-08-22-near-miss-ledger.md) |
| [23](23-come-find-it.md) | Come find it (outbound share) | mostly client | M | planned | [plan](../.claude/plans/2026-08-08-23-come-find-it.md) |

Effort: **S** ≈ a day, **M** ≈ a few days, **L** ≈ a week+.

## The one rule this folder must not break

Every idea here is a way of telling somebody something they didn't ask to be
told. That is the definition of a retention feature and also the definition of
the thing people uninstall an app over. Two constraints, non-negotiable, and
they are why several of these tickets are larger than they look:

1. **One gate, still.** `services/notifications/gate.shouldNotify` is the app's
   only decision about whether a notification may fire, and
   `notifications/hum.humNearbySecret` is its only exit to the OS. Nothing in
   this folder gets its own quiet-hours check, its own cooldown, or its own
   privacy-zone test. [17](17-someone-stood-here.md) and
   [21](21-before-it-fades.md) both need a **second kind** of notification;
   both extend the gate rather than route around it.
2. **Aggregate, never itemised.** A reader who walked to your bench is a
   stranger whose location you now hold. "3 people have stood here since
   Tuesday" is a warm fact about a place. "Someone stood here at 11:42 p.m." is
   a location trace of a person who did not consent to being tracked, and it is
   the single worst thing this app could accidentally ship. See
   [17](17-someone-stood-here.md) § Privacy — the bucketing rules there are the
   feature, not decoration on it.

## Suggested order

1. **18 The empty map speaks** — smallest change with the widest blast radius.
   Today's zero-drop map is a dead end for every user outside a seeded city, and
   the fix is one PostGIS query plus one card.
2. **20 Offline scrapbook** — a day's work, and it stops the app losing
   something a user physically walked fifty metres for. Pure win, no policy.
3. **17 Someone stood here** — the retention feature in this folder. Do it after
   18 and 20 because it is the one that needs the gate extended, and doing that
   under time pressure is how quiet hours gets forgotten.
4. **21 Before it fades** — rides on 17's delivery path once it exists; a
   fraction of the work if it comes second.
5. **19 First-walk letter** — hold until 17 and 18 are real. It is a content
   decision as much as an engineering one, and it deserves a deliberate
   conversation rather than a merge.
6. **22** and **23** opportunistically.

## Deliberately NOT doing

Everything FUN_TODOs rules out still stands — no photos, no streaks, no
leaderboards, no drifting drops. Additionally:

- **Push notifications from a server.** No account, no push token, no server
  that knows how to reach you: that is the privacy posture, not an oversight.
  Everything here is delivered by the device noticing something on its own
  schedule, through [16](../FUN_TODOs/16-background-walk-engine.md). If a
  feature only works with server push, it does not ship.
- **"Someone is reading your drop right now."** Live presence is a location
  trace with a friendly face on it, and it converts one anonymous reader into
  one identifiable event. Bucketed, delayed, aggregate — or not at all.
- **Re-engagement nags.** "You haven't walked in 5 days" is the genre of
  notification this app exists as an alternative to. Every notification in this
  folder is about something that *happened*, never about something the user
  failed to do.
- **Reply notifications with the reply text in them.** A lock-screen preview of
  a stranger's answer to your confession, readable by anyone holding your phone,
  defeats the 50 m rule and the anonymity promise in one line of copy. Counts
  only; the words stay behind the walk.
