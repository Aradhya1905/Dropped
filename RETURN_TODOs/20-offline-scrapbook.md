# 20 — Offline scrapbook

**Effort:** S · **Where:** client only · **Status:** planned
**Plan:** [2026-08-08-20-offline-scrapbook.md](../.claude/plans/2026-08-08-20-offline-scrapbook.md)

## What

Secrets you have already earned — found and saved — stay readable on the device
with no signal and after the app is killed. The Trail becomes a scrapbook you
own rather than a view onto a server.

## Why

Right now it is neither.

`store/dropsStore.ts` is a plain Zustand store with **no persistence**. Revealed
bodies live in memory and nowhere else — there is a comment saying exactly that
at `dropsStore.ts:27`, written for the panic wipe. `MapScreen.tsx:171`
acknowledges the consequence: *"After a restart the store is empty, which lands
everything on the sealed screen."*

So today:

- Kill the app and every secret you walked to is gone from the handset. The
  Trail refetches them from `/drops/trail/*` — which works, until it doesn't.
- **Where people walk is where signal fails.** Undergrounds, stairwells,
  basements, parks at the edge of a cell, a foreign SIM with no data. Those are
  not edge cases for this app; they are the app.
- It is the only feature in either folder where the user has already paid the
  full price — a physical walk to a physical coordinate — and the reward can
  still evaporate. That asymmetry is worse than any missing feature.

## Client work

- MMKV-backed cache keyed by secret id, holding the **body and its metadata**
  for drops this device has revealed, saved, or authored. New `StorageKeys`
  entry alongside `savedSecretIds` / `seenSecretIds` / `echoCache`.
- Hydrate `dropsStore` from it at startup. `MapScreen`'s `openEcho` branch
  (`MapScreen.tsx:174`) stops sending everything to the sealed screen after a
  restart, without any change to the reveal rules.
- Read-through in `features/trail`'s hooks: render the cache immediately, then
  reconcile with the server when a request succeeds. Show a quiet "saved on this
  device" state instead of a spinner when offline.
- Cap it (a few hundred entries, oldest evicted) and cap body length, like
  `FIRED_ID_CAP` and `FOG_CELL_CAP` already do for their lists.

## The wipe is the whole risk

Writing confessions to disk is a real change in the app's threat model. Three
things must hold, or this ticket makes the product worse:

- **The panic wipe must still win the race.** `usePanicWipe`'s `clearLocal`
  runs `clearAll(); queryClient.clear(); clearDrops();` in that order
  (`usePanicWipe.ts:102`), and `clearAll()` is `mmkv.clearAll()` — so a new MMKV
  key is erased for free. The hazard is the *other* direction: a store
  subscriber that persists on every change will re-create the cache a
  millisecond after `clearAll()` wiped it, from the `clearDrops()` call on the
  next line. Persistence has to be suspended for the wipe, and a test has to
  prove the key is absent after `clearLocal()` returns.
- **Nothing sealed is ever cached.** Only bodies this device has legitimately
  earned. A cache that quietly stored `nearby` results would put unrevealed
  confessions on the handset and break the 50 m rule at rest.
- **The reveal gate is unchanged.** This caches what was revealed; it does not
  decide what may be revealed. No cached row makes a sealed drop openable.

## Risks / notes

- Storage growth. Bodies are ≤ a few hundred characters and capped by count, so
  this is small — but it is unbounded-looking to a reviewer, so make the cap
  explicit and tested.
- Reconciliation: a drop hidden by moderation after you read it should disappear
  from the cache on the next successful sync. Stale-forever is the failure mode
  to design against.
- Interacts with [17](17-someone-stood-here.md): the receipts there should read
  from the same cache so the Trail is not half-offline.
