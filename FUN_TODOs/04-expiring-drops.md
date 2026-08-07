# 04 — Expiring drops

**Effort:** S · **Where:** backend + client · **Status:** todo
**Plan:** [2026-08-07-04-expiring-drops.md](../.claude/plans/2026-08-07-04-expiring-drops.md)

## What

At compose time the author can pick how long the drop lives: **7 days**,
**30 days**, or **forever**. After that it stops appearing in `nearby` and can't
be revealed.

## Why

- Scarcity creates urgency. A pin that says "fades in 3 days" is a reason to walk
  *today* instead of some day.
- It makes the map feel alive rather than a growing landfill of old pins.
- Free moderation win: a lot of bad content deletes itself, and authors are more
  willing to be honest when the confession isn't permanent — which is the whole
  emotional premise of the app.

## Backend work

- **Migration** — next free number is `drizzle/0004_drop_expiry.sql` (latest on
  disk is `0003_routing.sql`; if [03 replies](03-replies-in-place.md) lands first
  it takes 0004 and this becomes 0005):
  ```sql
  ALTER TABLE drops ADD COLUMN expires_at timestamptz;
  CREATE INDEX drops_expires_idx ON drops (expires_at) WHERE expires_at IS NOT NULL;
  ```
  Add to `src/db/schema.ts` and `tables.md`.
- **Schema** — `createDropBody` in `src/schemas/drop.schema.ts` gains an optional
  `expiresInDays: z.union([z.literal(7), z.literal(30)]).optional()` (absent =
  forever). Server computes `expires_at`; never accept a client timestamp.
- **Queries** — add `AND (expires_at IS NULL OR expires_at > now())` in
  `drop.repo.ts` for `nearby` and for reveal lookup. Trail lists should still
  show a user's own expired drops, marked faded.
- **Response** — surface `expiresAt` (ms epoch) on `apiSecretSchema`
  (`src/schemas/common.schema.ts`) and map it in `src/services/mappers.ts` so the
  client can render the countdown.
- **Cleanup** — no cron needed at this scale; filter on read. Revisit if the
  table grows.

## Client work

- Composer (`features/drop/screens/ComposerScreen.tsx`) — a small three-way
  chooser in the existing paper style. Default: **forever**, so nothing changes
  for people who don't care.
- Map pins and secret detail show a fading treatment + "fades in N days".
- Trail "dropped" list shows expired drops as faded/yellowed rather than hiding
  them — the author should see their own history.

## Risks / notes

- Decide what happens to `reveals`/`saves` on an expired drop. Recommendation:
  saved drops stay readable to the person who saved them; that's what "saved"
  means. Otherwise the save button is a lie.
- Don't hard-delete on expiry — reports and moderation history reference the row.
