# 14 — Settings: trust & privacy

**Effort:** M · **Where:** client + backend · **Status:** **built** (device QA
owed; the policy/contact URLs are still unset)
**Plan:** [2026-08-07-14-settings-trust.md](../.claude/plans/2026-08-07-14-settings-trust.md)

> ## ✅ Client complete — 2026-08-07
>
> Privacy zones enforce at the capture layer (fog writer, hum gate, echo poll,
> drop refusal), the panic wipe touches nothing local until `DELETE /devices/me`
> answers 200, and reporting is visible and confirms. See the plan's *What
> landed on the client* for the file-by-file account.
>
> **Owed:** the device QA pass below, and real values in
> `src/features/settings/legal.ts` — `PRIVACY_POLICY_URL` and
> `DATA_CONTACT_EMAIL` are `null`, so those two rows don't render.

> ## ✅ Backend complete — 2026-08-07
>
> `DELETE /devices/me` ships in `Dropped_Backend` on `feature/funToDos`
> (migration `0009_device_erasure.sql`). Everything below marked *backend* is
> done; the client half — privacy zones, the two-step confirm, the surfaced
> report action — is untouched and still open.
>
> **What landed**
>
> - `DELETE /devices/me`, one transaction, FK-safe order, answering a receipt:
>   `{ deleted: { reveals, saves, hearts, reports, stepDays },
>      anonymised: { drops, replies } }`. The client's confirmation copy is built
>   from those numbers, so a dialog can name what dies *and* what survives.
> - **The cascade decision, written down** in `tables.md` → *Erasure*: drops and
>   replies are anonymised to a **shared** sentinel device (`'__deleted__'`,
>   inserted by the migration), never deleted. Shared rather than one row per
>   wipe on purpose — a per-wipe tombstone still says "these fourteen
>   confessions are one person", which is a real deanonymisation vector across a
>   map.
> - `heart_count`, `reveal_count` and `stood_here` are **given back** before the
>   rows go, so counters other people read don't drift upward forever.
>   `reply_count` is deliberately untouched: an anonymised reply is still a voice.
> - Reports are deleted with the reporter, but **nothing is un-hidden** — a
>   verdict already reached stands, or "delete my account" becomes a
>   moderation-evasion tool. (Also why reports are *not* anonymised: the
>   threshold counts `DISTINCT device_id`, so collapsing erased reporters into
>   one row would quietly lower it.)
> - `replies_drop_device_uniq` is now **partial** (`WHERE device_id <>
>   '__deleted__'`). Without it, the second person to ask for erasure is refused
>   because of the first — both replies to the same drop would collide on the
>   sentinel. `reply.repo`'s `ON CONFLICT` clause repeats the predicate verbatim;
>   the coupling is flagged in both files and in `tables.md`.
> - An empty body with `Content-Type: application/json` no longer 400s at the
>   parser. The panic wipe must not fail because a client sets a default header.
> - `tests/erase.spec.ts` — 18 tests. Full suite: 215 passing.
>
> **Still owed on the client** (unchanged by this): privacy zones at the capture
> layer, `usePanicWipe` with the two-step confirm, the visible report action,
> and the "Your data" section. Two server-side facts the client work depends on:
>
> 1. **Do not wipe locally until the call returns 200.** A local wipe after a
>    failed server call leaves someone believing their confessions are gone while
>    they are still on the map.
> 2. The endpoint is **idempotent** — a retry after a timeout returns zero counts
>    rather than an error, so the retry path is safe to take.

In an anonymous location app that collects confessions, **trust is a retention
feature**. People uninstall when they get an uneasy feeling, not when they run
out of content. These three settings answer the three uneasy questions.

## Home privacy zone

*"Is it tracking where I live?"*

- User drops a circle (default ~150 m) on the map: inside it the app never
  records a fog-of-war cell ([01](01-fog-of-war.md)), never fires a walk-by
  notification, and refuses to place a drop.
- Entirely client-side — the zone itself is stored only in MMKV and never sent to
  the server. That's the point, and it's worth saying so in the UI copy.
- Support 2–3 zones (home, work, school).

## Panic wipe

*"Can I make this go away?"*

- One row, hard confirm: rotate the device id and erase everything local.
  `clearAll()` already exists in `services/storage` — the local half is one call
  plus a fresh `deviceId`.
- ~~**Backend work needed — this endpoint does not exist yet.**~~ **Done.**
  `DELETE /devices/me` exists. None of the `device_id` FKs cascade, so the erase
  clears them by hand in one transaction; the decision that needed making is
  made and written into `tables.md` → *Erasure*:
  - `reveals`, `saves`, `hearts`, `device_steps`, `reports` → deleted, with
    `heart_count` / `reveal_count` / `stood_here` given back first.
  - `drops` **and `replies`** → **anonymised, not deleted**, re-pointed at a
    shared `'__deleted__'` sentinel device row rather than nulling the column.
    Sentinel over nullable because it keeps the FK and every existing query
    intact; *shared* over per-wipe because one tombstone per person still links
    their drops to each other.
- This is also the store-listing / data-deletion answer both Google Play and the
  App Store require for a location + UGC app, so it's not optional forever.

## Report & blocked content

*"What happens when I see something awful?"*

- Reporting exists server-side (`POST /drops/:id/report`, `reports` table,
  `REPORT_HIDE_THRESHOLD` shadow-remove) and `useReport.ts` exists client-side —
  surface it properly: a visible report action, a confirmation that something
  happened, and a list of what you've reported.
- A contact route for erasure/appeal requests, plus a privacy policy link, both
  called out in the remaining-work doc for screen 11.

## Client work

- `YouScreen.tsx` gains a "Your data" section, visually separate from the
  playful settings.
- Copy matters as much as code here. The design already promises "it never leaves
  your device" for the user's own location — these settings are where that
  promise gets receipts.

## Risks / notes

- **Panic wipe is irreversible.** Two-step confirm, name what will be destroyed
  and what will survive (anonymised drops), and do the local wipe only after the
  server call succeeds.
- Home privacy zone must be applied at the *capture* layer, not the render layer.
  Filtering on display while still recording the cells would be a lie.
