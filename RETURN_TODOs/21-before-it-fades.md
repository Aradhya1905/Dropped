# 21 — Before it fades

**Effort:** S · **Where:** backend + client · **Status:** planned
**Plan:** [2026-08-08-21-before-it-fades.md](../.claude/plans/2026-08-08-21-before-it-fades.md)

## What

A drop you set to expire tells you once, the day before it goes: *"What you left
on Church Street fades tomorrow. 4 have stood there."* And when it does go, its
Trail card turns into a closed receipt rather than silently fading out.

## Why

[04](../FUN_TODOs/04-expiring-drops.md) shipped `expires_at` and the read-side
filtering, and it is a good feature: a 7-day drop is a different kind of object
from a permanent one. But nothing closes it.

- The author picks "7 days" at compose time and then never hears about it again.
  The one moment in this app with a **natural deadline** — the thing every
  retention mechanic in the industry is faking — is currently spent in silence.
- `tables.md` is explicit that nothing is ever hard-deleted on expiry and that
  the trail queries deliberately do not filter, so the author keeps seeing their
  own expired drops "rendered faded". A faded card that never said goodbye reads
  as a bug.
- It is the only notification this app can send that is genuinely *time*-bound
  rather than place-bound, which makes it the one that reaches somebody who has
  not left the house.
- Paired with [17](17-someone-stood-here.md) it is a complete story: here is
  what you left, here is who stood there, here is it closing.

## Backend work (`C:\My_Projects\Dropped_Backend`)

Almost none, if [17](17-someone-stood-here.md) lands first.

- Extend `GET /devices/me/activity` with `expiringSoon: [{ dropId, placeLabel,
  city, expiresAt, revealCount, replyCount }]` — the caller's own `origin='user'`
  drops where `expires_at` falls inside the next ~36 h.
  - Same query, same route, same rate limit, same cursor discipline. **Do not
    add a second endpoint**; the client already polls one.
- If 21 ships first, the same query stands alone — but then it also has to bring
  the cursor column and the delivery path with it, which is why the order
  matters.

## Client work

- One notification, at most once per drop, through
  `notifications/gate.shouldNotify` with the same `kind` mechanism
  [17](17-someone-stood-here.md) introduces. Quiet hours and privacy zones
  apply; radius and mood do not.
- The "expiring" state on the Trail's dropped cards — a stamped *fades
  tomorrow* rather than a countdown timer. No urgency theatre.
- The **closed receipt**: once past `expires_at`, the card states plainly what
  the drop collected in its life and that it is closed. This is the emotional
  point of the ticket; the notification is the smaller half.
- Nothing offers to renew or extend. An expiring drop was a decision the author
  made on purpose.

## Risks / notes

- **Do not invent urgency.** No countdown, no "last chance", no repeat. One
  notice, one day out, and then the receipt. The genre this must not join is
  the one the app exists as an alternative to.
- Timing without a server push means the notice arrives on the device's own
  schedule — it may land at 9 a.m. or not until the evening. That is correct and
  should not be papered over with a scheduled local notification fired from a
  guessed timestamp; a drop can be hidden by moderation between the schedule and
  the fire, and a notification about a moderated drop is the worst outcome here
  (same rule as [08](../FUN_TODOs/08-anniversary-echo.md)'s).
- If the author has no expiring drops — the common case, since "forever" is the
  default — this feature is invisible. Correct.
