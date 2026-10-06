# Next app — idea shortlist

_2026-08-23_

Brief: **one more fun app, in the spirit of Dropped, finishable in ~1 month.**

This document is a decision aid, not a research pile. It ends with one
recommendation, a four-week plan, and a Day-1 move. Per the vault rule — _"the
2 days are for choosing, not for researching"_ — read the scorecard, pick, and
close this file.

---

## 1. What this is based on

Read before writing: `Dropped` (client + `.claude/plans/*`, 28 of them),
`Dropped_Backend`, `MotoCar`, `ConsoleWatch`, `vscode-scrcpy`,
`InspectAnyCar_*`, `Lipi`, `Pen_Flow_Frontend`, `SwingTradingAlgo`,
`Daily_Stuff/Obsidian`.

Three things fell out of that read, and they drive every idea below.

**(a) You are not short of ability, you are short of a scope that closes.**
Dropped went from empty repo to 14 screens + MapLibre + live GPS + a deployed
PostGIS backend in roughly **four weeks of active days** (55 commits,
2026-05-31 → 2026-06-26). Then the log goes 26 Jun → 29 Jul → 22 Aug. The gap
is not a skill gap. It is the gap `Daily_Stuff/CLAUDE.md` already names.

**(b) Dropped did not stall on engineering. It stalled where the brief said it
would.** `CLAUDE.md`: _"Moderation is the hard problem, not engineering."_
`2026-06-13-remaining-work.md` §2 puts the moderation pipeline in front of any
public release, and §6 flags "location + UGC make both stores strict about
this". Every idea below is deliberately chosen so that **stranger-authored free
text is not on the critical path**. That single constraint is what turns a
month into a shippable month.

**(c) Dropped has a cold-start problem you already wrote a plan about and never
solved.** `.claude/plans/2026-08-08-18-the-empty-map-speaks.md` exists because
a location app with no other users shows an empty map — to you, alone, at
night, testing on the Nothing Phone in your own neighbourhood. The app cannot
feel alive until strangers use it, and strangers cannot use it until moderation
ships. That is a deadlock.

> **The scoring rule that follows from (c): prefer an app that is fully alive
> with exactly one user — you.** Content should be generated, personal, or
> daily-published, not crowd-sourced. Multiplayer, if any, should be opt-in
> between people who already know each other.

---

## 2. The leverage you already own

A month is only realistic because almost none of the plumbing is new. This is
the honest inventory.

| Asset | Where it lives | What it buys you |
|---|---|---|
| Bare RN 0.85.3 / React 19.2.3 / TS skeleton | `Dropped/src`, same shape in `MotoCar/src` | `app/ design-system/ features/ services/ store/ utils/ types/` — copy the tree, delete the features |
| Design-system pattern | `Dropped/src/design-system/{tokens,components,icons}` | tokens → components → 18 stroke icons, sourced from an HTML design export. Repeat the pattern, new palette |
| Four licensed font families | `Dropped/assets/fonts` (Newsreader, Geist, Geist Mono, Caveat) | linked via `react-native-asset`, `Platform.select` already handled in `tokens.typography` |
| Fastify 5 + Zod + Drizzle + postgres.js + Neon **PostGIS** | `Dropped_Backend/src` | `routes → controllers → services → repositories → db`, Scalar docs, `{message}` error contract |
| Anonymous auth, already solved | `Dropped_Backend/src/plugins/deviceId.ts` + `Dropped/src/services/device` | `X-Device-Id` UUID header, lazy device upsert. No accounts, no password reset, no OAuth screens |
| Server-side geo verification | `Dropped_Backend/src/services/reveal.service.ts` (`ST_DWithin` / `ST_Distance`) | the "you must actually be there" primitive, untrusted-client-safe, already tested |
| Deploy that works | `scripts/deploy.ps1`, Oracle free VM, PM2, duckdns HTTPS | a second PM2 app + a second subdomain is about an hour, not a week |
| Map stack at $0 | `Dropped/src/services/maps/{droppedStyle.ts,maplibreAdapter.tsx}` | MapLibre + Protomaps CDN tiles, custom style JSON, `flyTo/setMarkers/getCenter` adapter, jest-mocked |
| Reverse geocoding at $0 | `services/maps/reverseGeocode.ts` (Nominatim) | coordinate → human place name, debounced on a ~11 m key |
| Single shared GPS watch | `Dropped/src/store/locationStore.ts` + `features/map/hooks/useDeviceLocation` | the exact bug you already paid for once (`2026-08-22-ux-repair-pass.md`) — copy the fixed version |
| Compass heading | `services/location/useCompassHeading.ts` | `react-native-compass-heading`, shortest-arc tween already in `nearby/components/Compass.tsx` |
| Pedometer | `services/pedometer` + `@dongminyu/react-native-step-counter` | motion permission flow already primed in onboarding |
| Local notifications | `services/notifications/notifeeAdapter.ts` | Notifee, tested, with a noop adapter for jest |
| MMKV storage + key registry | `services/storage/{index.ts,keys.ts}` | synchronous KV, no async boilerplate |
| Splash, crash reporting, devtools | bootsplash, Firebase Crashlytics, Reactotron (+ MMKV and React Query panels) | day-one observability |
| Android test rig | `scripts/android-dev.js`, `install-apk.js`, per-device yarn scripts | `yarn runOn_NothingPhone` / `runOn_Sumsung`, Metro pinned to 8086 |
| **Mock GPS harness** | `mock_location.ps1` (drives `com.lexa.fakegps` over adb) | you can test a walking app **sitting at your desk**. This is worth more than it looks |

Not built, despite having plans: the background walk engine.
`.claude/plans/…-16-background-walk-engine.md` and `…-22-near-miss-ledger.md`
both reference `src/services/walkEngine/` — it does not exist. Anything below
that needs continuous background GPS is buying that work, not reusing it.

Constraints: **Android only** (no Mac; `ios/` has never been built), one
developer, evenings and weekends until 15 Sep.

---

## 3. Scorecard

Weighted for what actually decides whether this ships: can you test it alone,
does it survive having zero other users, does it dodge the moderation wall.

| | **Errand** | **Somewhere** | **Claim** | **Warmer** | **Drift** | **Roll** |
|---|---|---|---|---|---|---|
| Fun to *use* | ●●●● | ●●●●● | ●●●●● | ●●●●● | ●●● | ●●●● |
| Fun to *build* | ●●●●● | ●●● | ●●●●● | ●●● | ●●●● | ●●● |
| **Alive with 1 user** | ●●●●● | ●●●●● | ●● | ○ | ●●●●● | ●●●● |
| **Testable at your desk** | ●●●● | ●●●●● | ●●● | ○ | ●●●● | ●●●●● |
| Dodges moderation | ●●●●● | ●●●●● | ●●●● | ●●●●● | ●●●●● | ●●● |
| Reuses your stack | ●●●●● | ●●●● | ●●●●● | ●●●●● | ●●●● | ●●● |
| Fits 4 weeks | ●●●● | ●●●●● | ●●● | ●●●●● | ●●●●● | ●●● |
| Shareable artifact | ●●● | ●●●●● | ●●●● | ●● | ●●●●● | ●●●● |
| Novelty | ●●●● | ●●● | ●●● | ●●●● | ●●●●● | ●● |

**Recommendation: Errand.** Runner-up, and the safer pick if you want maximum
certainty of a finished thing: **Somewhere**.

---

## 4. The six

### 1 — Errand ★ recommended

_alt names: Fetch · The Long Way · Sent_

**Pitch.** The city hands you a small quest. Open the app, it looks at what is
actually around you in OpenStreetMap, and writes you a three-to-five stop hunt
through your own neighbourhood: _"Find the bench that faces the water."_ →
_"From there, something that has been counting since before you were born."_
You walk it. Each stop unlocks by proximity. At the end you get a stamped card
for the route.

**Loop.** `accept → walk → find → unlock → next stop → route card`

**Why it is fun.** It is the Dropped walk without the empty map. The getting-
warmer feeling, the lying compass, the reveal — all the good parts — except the
content generator never runs dry and never needs a stranger. It also makes you
look at your own street, which is what Dropped was actually about.

**Why it is one month.** The hunt generator is one backend service. Everything
else you have built once already: GPS watch, proximity unlock via `ST_DWithin`,
MapLibre background, compass needle, haptics, notifications, scrapbook screen.

**How content gets made.** Overpass API → every POI within ~1.2 km of the user
(benches, fountains, murals, clock towers, post boxes, big trees, plaques, bus
shelters, temples, bakeries). Filter to things with enough tags to be
describable. Then one Claude API call turns a POI's tags plus its neighbours
into a riddle that never names the thing. Cache the riddle by OSM element id,
so each POI costs a few tokens **once, ever**, and the second person in your
neighbourhood gets it free. Templated riddles are the fallback behind the same
interface if model output is weak.

**Hard parts, honestly.**
1. OSM density varies wildly — a generator that is delightful in Indiranagar
   may produce nothing in a low-tag suburb. The day-1 spike is an Overpass
   query around your own flat, counting usable POIs.
2. Riddle quality *is* the product. Budget real time on the prompt, and ship a
   "this riddle was bad" button so you get a corpus of failures to tune on.
3. POIs move or vanish. A "can't find it" skip that does not break the hunt is
   required, not optional.

**Cut line if week 3 goes badly.** Ship one-hunt-at-a-time, templated riddles,
no route card. Still a complete app.

**Stretch, only if ahead.** Share a hunt by code so a friend walks the exact
route you did, and you watch their stamps land.

---

### 2 — Somewhere

_alt names: Bearings · Here?_

**Pitch.** Wordle for your own city. Every morning at 06:00 one street-level
photo taken somewhere in Bengaluru is published. You get one guess: drop a pin.
The app scores you on distance and shows the reveal. One puzzle a day, everyone
in the city gets the same one, and the result is a shareable little grid.

**Loop.** `open → look → pin → score → share → tomorrow`

**Why it is fun.** The daily-ritual format is the most reliably engaging
mechanic in consumer apps, and doing it for *your own city* turns "I know this
place" into a real skill worth showing off.

**Why it is one month.** Smallest backend on the list: one row per city per
day, one scoring endpoint, one cron. Scoring is `ST_Distance` — literally the
function `reveal.service.ts` already calls. Three screens, maybe four.

**Where photos come from.** Mapillary's free API (`graph.mapillary.com`,
CC-BY-SA street-level imagery, worldwide, token-based). **Day-1 spike: query a
Bengaluru bounding box and count usable images.** Coverage in Indian cities is
contributor-driven and uneven. If it is thin, the fallback is that *you* seed
photos from your own walks — slower, but more charming, and it gives the app a
voice.

**Hard parts, honestly.** Photo supply is the entire risk, and it is a data
risk rather than a code risk, so it is settleable in one evening before you
commit. On-screen attribution is mandatory for CC-BY-SA imagery. Anti-cheat is
not worth building for a game people play honestly.

**Cut line.** One city, no streaks, no leaderboard. Photo, guess, score, share
card.

---

### 3 — Claim

_turf war, on foot_

**Pitch.** Walk a closed loop and the area inside it becomes yours, drawn on
the map in your colour. Walk a loop through someone else's territory and you
take that slice. A season lasts a month; whoever holds the most city wins.

**Loop.** `walk → close the loop → claim → defend`

**Why it is fun.** Highest raw fun on the list, and the most fun to *build* —
a genuine PostGIS playground: `ST_MakePolygon`, `ST_Area`, `ST_Difference`,
self-intersection repair, simplification for wire size. You would enjoy every
day of it.

**Why it might not be one month.** It needs the background walk engine that
does not exist yet: Android foreground service, notification channel,
battery-aware GPS cadence, doze-mode survival. Plan 16 scopes it; nothing is
built. Add polygon repair over noisy urban GPS and that is two hard systems in
one month.

**And it fails the one-user test.** Territory is only meaningful against
someone. You would be testing an empty city, alone — the exact deadlock from
§1(c).

**Take it if** you have three friends who will genuinely walk for a month. That
is a real question with a yes/no answer. Ask it before you pick this.

---

### 4 — Warmer

_hide and seek, for real places_

**Pitch.** One person hides a virtual thing at a real spot in a park. Everyone
else gets a compass that lies when they are far and firms up as they close in,
plus a hot/cold hum in the haptics. First to stand on it wins the round.

**Loop.** `host hides → room code → hunt → hum → found`

**Why it is fun.** Physical, loud, funny — and the most direct use of the lying
compass you already designed (`.claude/plans/…-12-lying-compass.md`) and never
shipped.

**Why it is one month.** Genuinely small. Room code, one hidden coordinate,
polling every three seconds, compass + haptics + a win screen. Two weeks of
build, two weeks of feel-tuning.

**Why it is ranked here anyway.** You cannot test it alone. Every meaningful
iteration needs two phones and an outdoor space. For a solo evening build that
is fatal friction, and it is the only reason this is not the recommendation
despite being the most fun idea on the page.

---

### 5 — Drift

_a deck of instructions, and a souvenir_

**Pitch.** No map, no destination. Tap start and the app gives you one
instruction at a time: _"Walk toward the tallest thing you can see."_ · _"Take
the third left."_ · _"Follow someone who looks like they know where they're
going, for two minutes."_ · _"Stop when you smell food."_ You obey. Forty
minutes later it hands you a printable, editorial souvenir — your actual traced
path as a piece of art, with distance, steps, the instructions you followed and
the places you passed.

**Loop.** `start → obey → obey → obey → souvenir`

**Why it is fun.** The only idea here that is *about something*. And the
souvenir is the product: a beautiful thing you made by walking, that you want
to show people.

**Why it is one month, comfortably.** It barely needs a backend. GPS trace,
step count, reverse geocode, a hand-written deck of ~60 instructions with
simple context rules, then real craft on the souvenir renderer — SVG path
smoothing, paper texture, letterpress type, PNG export and share. That craft is
where the month goes, and it is craft you are already good at
(`Pen_Flow_Frontend`, the Dropped design system).

**Risk.** Under-scoped. You could finish v1 in ten days and then drift (sorry)
into polish with no forcing function. Set the souvenir bar high on day one so
the month has somewhere to go.

**Best fit for:** Slot B. This is the "one-screen mobile app v0" already in your
vault, with a soul.

---

### 6 — Roll

_a camera that makes you wait_

**Pitch.** 24 exposures. No preview, no retakes, no filters. Whatever you shoot
today develops at sunrise tomorrow, and you find out then whether you got it.
Optionally share a roll with a small circle — a trip, a wedding, four friends —
and nobody sees anything until dawn.

**Loop.** `shoot → wait → dawn → develop → keep`

**Why it is fun.** Delayed gratification is a strong, proven retention mechanic
(Dispo, Lapse), and the sunrise notification is a lovely use of Notifee.

**Why it is riskier than it looks.** Vision Camera on bare RN plus an image
pipeline plus object storage is real work — you have R2 experience from
`InspectAnyCar_Backend`, but it is a new integration here. And photos in shared
circles are UGC with a body attached: a *worse* moderation surface than
Dropped's text, not a better one. Keep circles invite-only and small, or keep it
fully private and lose the social hook.

**Take it if** the camera-and-craft part is what you actually want to spend a
month on.

---

## 5. If you pick Errand — the four weeks

Two commit windows under the vault rules: gut check at day 7, decide at day 14,
extend once to reach day 28.

**Repos.** `C:\My_Projects\Errand` and `C:\My_Projects\Errand_Backend`, matching
the existing naming. Clone the *shape* of Dropped, not the code: copy
`src/app`, `src/design-system/tokens`, and
`services/{storage,device,location,maps,haptics,notifications}`, then delete
every feature folder.

### Week 0 — one evening, before you commit

The only thing that can kill this idea is thin OSM data. Settle it first.

Run one Overpass query for a 1.2 km radius around your flat, count elements
carrying a usable name or a describable tag combination, and eyeball twenty of
them. **Threshold: about 40 usable POIs.** Below that the generator repeats
itself within a week — take Somewhere instead. This is an hour, and it is the
highest-value hour of the month.

### Week 1 — the generator, headless

No app. A backend endpoint and a JSON response you read in Scalar.

- Fastify service copied from `Dropped_Backend`: `routes → controllers →
  services → repositories`, `X-Device-Id` plugin, error handler, Scalar docs,
  Neon + PostGIS, `_migrations` runner. Number migrations from `0001` — this is
  a fresh database, so the `0004`–`0009` mess recorded in the Dropped DB does
  not follow you.
- `overpass.service.ts` — fetch and normalize POIs, cached by tile so you are
  not hammering a free API.
- `hunt.service.ts` — choose 3–5 stops with a walkable spacing rule
  (200–500 m apart, total under ~2.5 km, no backtracking).
- `riddle.service.ts` — Claude API, one call per POI, cached by OSM element id
  in Postgres. Templated fallback behind the same interface.
- Vitest against a fixed Overpass fixture, so the suite does not depend on the
  network.

**Day 7 gut check:** does a generated hunt for your own neighbourhood read like
something you would actually walk? Flat riddles are a prompt problem — one
evening. Boring *stops* are a data problem — kill it and take Somewhere.

### Week 2 — the walk, on a phone

- Four screens: Home (accept a hunt) · Hunt (riddle, distance, compass) · Found
  (the unlock) · Complete (route card). Resist a fifth.
- Lift `locationStore` and `useDeviceLocation` from Dropped **as fixed on
  2026-08-22**, not the pre-repair version.
- Unlock is server-side: post a one-shot position, the server checks
  `ST_DWithin` at ~25 m and returns the next riddle. Never trust the client —
  the invariant in `Dropped_Backend/CLAUDE.md` exists for reasons that apply
  identically here.
- Compass: reuse `Compass.tsx` with the lying-needle curve from plan 12 — vague
  beyond 300 m, locked under 100 m. This is the mechanic that makes the last
  fifty metres a search instead of a commute.
- Test the whole loop at your desk with `mock_location.ps1`, then walk one real
  hunt outdoors before the window closes. **Day 14: extend.**

### Week 3 — make it a place, not a demo

- Design system: pick a palette that is **not** Dropped's paper/sage. Same
  method, new voice — reusing the palette will make it feel like a fork.
- The found moment: haptic, sound, an animation worth waiting for. Dropped's
  wax seal is the bar to beat.
- Notifications: "two minutes from your next stop" when backgrounded and a fix
  arrives cheaply. No foreground service — polling on resume is enough, and it
  keeps the unbuilt walk engine off the critical path.
- Failure states from day one, not week four: no GPS, network lost mid-hunt,
  POI missing, skip a stop, abandon a hunt. `2026-08-22-ux-repair-pass.md` is
  the written record of what it costs to add these late.

### Week 4 — close it

- Route card: stops, traced path, time, a stamp. Export as an image and share.
  This is what makes it feel finished.
- History screen — hunts you have walked. Reuse the Trail scrapbook idea.
- Signed release APK, Crashlytics on, icon, splash, name.
- Hand the APK to three people. Watch one of them walk a hunt without
  narrating, and write down every place they hesitate.

**Ship = a signed APK someone else finished a hunt on.** Not the Play Store.
Store listings, privacy policy and data-safety forms for a location app are a
week of their own; that is a separate decision, after this one closes.

---

## 6. If you pick Somewhere — the compressed version

- **Week 0** — query Mapillary for a Bengaluru bbox, count images with usable
  quality and spread. This is the whole risk; settle it in an evening.
- **Week 1** — backend: `puzzles` table (one row per city per day), a picker
  that avoids repeats and clusters, `POST /guess` scored with `ST_Distance`, a
  daily cron on the same PM2 box. Plus the admin escape hatch: pin tomorrow's
  photo by hand when the picker chooses badly.
- **Week 2** — app: photo view, pan/zoom map, pin drop, confirm, reveal (line
  from your pin to truth, distance, score).
- **Week 3** — the share card. This is the growth loop and deserves a full
  week: a rendered image, spoiler-free, distinctive enough to recognise in a
  group chat. Plus streaks and a distribution of today's guesses.
- **Week 4** — archive of past puzzles, 06:00 notification, polish, release.

Lower ceiling than Errand, higher floor. If what you want most is the certainty
of a finished thing with a share loop, take this.

---

## 7. Considered and rejected

| Idea | Why not |
|---|---|
| Dropped, but a different flavour of anonymous confession | Same moderation wall, same cold start. You already own the good version — finish that one instead |
| Ambient-audio pinning ("hear this place") | Audio UGC is a worse moderation surface than text, and far harder to review |
| Habit / streak / focus tracker | No physical world, no novelty, and you would be bored by week two |
| Sky / constellation AR | Heavy astronomy maths, crowded category, and none of your stack transfers |
| Strava-style ghost racing | Crowded, and the incumbents own the social graph |
| Time capsule to your future self | Dropped with the interesting half removed |
| A second VS Code extension _(parked in `05 Ideas`)_ | A fine project, but it is the ConsoleWatch lane. This slot was asked for as a *fun app* |

---

## 8. Day-1 move

Errand and Somewhere both hang on a single data question that one evening
answers. Do the spike **before** the slot clock starts, so the two-day choosing
window is spent choosing rather than wondering.

1. Overpass — count usable POIs within 1.2 km of home. Threshold ~40.
2. Mapillary — count usable street-level images across a Bengaluru bbox.

Whichever comes back richer is your app. If both come back rich, take
**Errand**: it keeps the walking-app thread you already care about, and its
interesting problem is one you have not solved before.

Then park the losers in `Daily_Stuff/Obsidian/05 Ideas.md` under **Parked**, one
line each, so they stop taking up room.
