# 14 — Settings: trust & privacy

**Effort:** M · **Where:** client + backend · **Status:** todo
**Plan:** [2026-08-07-14-settings-trust.md](../.claude/plans/2026-08-07-14-settings-trust.md)

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
- **Backend work needed — this endpoint does not exist yet** (`devices.routes.ts`
  has only `GET /devices/me`, `/stats`, and the steps pair):
  `DELETE /devices/me`. Cascade behaviour needs a decision, because **none** of
  the `device_id` FKs cascade — `reveals`, `saves`, `hearts`, `reports` and
  `drops` all plain-`REFERENCES devices(id)`, so the delete must clear them in
  order or it fails on the FK:
  - `reveals`, `saves`, `hearts`, `device_steps`, `reports` → delete.
  - `drops` → **anonymise, don't delete.** A drop someone else already walked to
    and revealed shouldn't vanish from the world; null the `device_id` (needs the
    column made nullable, or a shared `deleted` sentinel device row). Decide and
    write it down in `tables.md`.
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
