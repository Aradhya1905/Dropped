# 03 — Replies in place

**Effort:** L · **Where:** backend + client · **Status:** built, migrated — device QA owed
**Plan:** [2026-08-07-03-replies-in-place.md](../.claude/plans/2026-08-07-03-replies-in-place.md)

## What

After you reveal a drop, you can leave **one short line** pinned to the same
coordinate, underneath it. Only people who have physically stood there can write
one, and only people who stand there can read them. A drop becomes a thread that
only grows from feet.

## Why

The single biggest retention idea in this folder.

- Today a drop is a dead letter: read once, done, never return.
- With replies, a spot accrues history. People come back to the same bench to see
  what showed up. That's a reason to reopen the app without a notification.
- It's the only feature here that creates *content* from readers, not just
  droppers — which matters when drops are rate-limited to `DROP_DAILY_LIMIT`
  (default 5) per device.
- The physical gate is already enforced and trusted: a `reveals` row is proof the
  server verified you within 50 m.

## Backend work (`C:\My_Projects\Dropped_Backend`)

- **Migration** `drizzle/0004_replies.sql`:
  ```sql
  CREATE TABLE replies (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id    uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
    device_id  text NOT NULL REFERENCES devices(id),
    body       text NOT NULL,
    status     text NOT NULL DEFAULT 'visible',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX replies_drop_idx ON replies (drop_id);
  ```
  Add to `src/db/schema.ts`. Update `tables.md`.
- **Endpoints**
  - `POST /drops/:id/replies` — body `{ body: string }`. **Rejects with 403
    unless a `reveals` row exists for (drop_id, device_id).** That check is the
    whole feature; do it in `reveal.service`/`engagement.service`, not the
    controller.
  - `GET /drops/:id/replies` — same gate. Paginated, oldest first.
  - `DELETE /drops/:id/replies/:replyId` — author's own only.
- **Moderation** — run replies through the existing `moderation.service` on
  ingest, exactly like drop bodies. Extend `reports` to cover replies (either a
  nullable `reply_id` column or a `target_type`/`target_id` pair) so the
  shadow-remove threshold applies to replies too. **Do not ship replies without
  this** — it doubles the UGC surface and the brief calls moderation the hard
  problem.
- **Limits** — one reply per device per drop (unique index on
  `(drop_id, device_id)`), max ~140 chars, per-device daily reply quota alongside
  `DROP_DAILY_LIMIT`.
- **Counter** — `reply_count` on `drops`, or count on read. Prefer a column so
  `nearby` can show "3 voices here" without an N+1.

## Client work

- New feature area or fold into `features/reveal`: `api` + hooks
  (`useReplies`, `useCreateReply`) following the shape of
  `features/reveal/hooks/useHeart.ts` / `useSave.ts`.
- UI on `features/reveal/screens/SecretScreen.tsx` — replies as small torn-paper
  strips under the secret, Caveat font, in keeping with the design language.
- Compose affordance reusing the ruled-paper input from `ComposerScreen.tsx`.
- Show reply count on the map pin / secret detail so it's a visible reason to
  walk back.

## Risks / notes

- **Moderation load is the real cost, not the code.** Budget for it.
- Interacts with the "read once · reseal or fade" rule on screen 07 — decide
  whether replies are re-readable after the secret reseals. Recommendation: yes,
  replies stay readable at that coordinate; that's the whole point.
- Consider hiding reply authorship entirely (no device id shown, ever) to keep
  the anonymity promise unambiguous.
