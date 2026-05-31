# Handoff: Dropped — Onboarding & Core Flow

## Overview
**Dropped** is a location-based, anonymous "secrets" app: people pin written confessions to a real-world spot, sealed in digital wax. Anyone who physically walks within **50 metres** of that spot can break the seal and read it. No accounts, no usernames, no photos — one device, one trail.

This package documents the **full first-run + core loop**: welcome → how it works → location permission → walking a secret into range → breaking the seal → reading it → leaving your own → your trail → your (anonymous) profile.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS** — prototypes that show the intended look and behaviour. They are **not production code to copy verbatim**. Your task is to **recreate these designs in the target codebase's environment** (React Native, SwiftUI, Flutter, React web, etc.) using its established patterns, components, and libraries. If no environment exists yet, pick the most appropriate framework for a mobile-first app and implement there.

**However** — the styling is the valuable part and is easy to lose in translation. Treat `dropped.css` as the **authoritative design system**: pull exact color tokens, type roles, spacing, radii, and the seal/paper/map treatments from it rather than re-deriving them by eye from screenshots. The single most common failure mode is rebuilding from a screenshot and approximating the aesthetic — don't. Consume the CSS.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, motion, and copy. Recreate pixel-faithfully using the codebase's libraries. Every screen is designed at a **372 × 806** logical phone frame (iPhone-class, 44px rounded screen, Dynamic-Island notch).

---

## Design Tokens

### Color (from `dropped.css` `:root`)
| Token | Hex / value | Role |
|---|---|---|
| `--paper` | `#F1EBDE` | App background base (warm paper) |
| `--paper-deep` | `#E8E0D0` | Background gradient bottom |
| `--paper-card` | `#F7F2E8` | Cards, notes, sheets |
| `--ink` | `#211D17` | Primary text, primary buttons |
| `--ink-soft` | `#6E655A` | Body / secondary text |
| `--ink-faint` | `#A79D8D` | Captions, meta, mono labels |
| `--line` | `rgba(33,29,23,0.14)` | Hairline borders |
| `--line-soft` | `rgba(33,29,23,0.07)` | Card outline / faint dividers |
| `--accent` | `#76957C` | **Sage** — the one accent (wax seals, pins, dots) |
| `--accent-deep` | `#566E5B` | Sage pressed / deep |
| `--accent-tint` | `rgba(118,149,124,0.14)` | Washi-tape fills, highlights |
| `--wax` | = `--accent` | Wax-seal color alias |

Screen background is a radial gradient: `radial-gradient(115% 80% at 50% -8%, #F8F3E9 0%, var(--paper) 52%, #EDE5D6 100%)`. A faint multiply-blended fractal-noise grain overlays the whole surface (see `body::before` — an inline SVG data-URI).

### Typography
| Role | Family | Notes |
|---|---|---|
| `--serif` | **Newsreader** (Georgia fallback) | Editorial hero/titles; frequently *italic* for emotive lines |
| `--sans` | **Geist** (system-ui fallback) | UI / body / buttons |
| `--mono` | **Geist Mono** | Kickers, meta, place tags, uppercase + wide letter-spacing |
| `--hand` | **Caveat** | Handwritten secret text + playful kickers ("psst —") |

Load via Google Fonts (weights used): Newsreader 300/400/500 + italic 300/400; Geist 300/400/500/600; Geist Mono 400/500; Caveat 400/500/600.

Representative type sizes (px, mobile): hero wordmark 62–68 · section titles 26–36 · body 13.5–14.5 · handwriting 20–23 · mono kicker 9.5–11 (letter-spacing .2–.42em, uppercase).

### Radius / shadow / spacing
- Phone shell radius 56, screen radius 44, buttons 30 (pill), cards 2–14.
- Cards: `box-shadow: 0 16px 30px -18px rgba(43,33,20,.5), 0 0 0 1px var(--line-soft)`.
- Wax seal: `radial-gradient(circle at 35% 30%, var(--accent) 0%, var(--accent-deep) 78%)` in a circle, soft sage drop shadow + inset highlight.
- Primary button: 56px tall pill, `background: var(--ink)`, text `--paper-card`, 7px sage dot; hover lifts `translateY(-2px)`.
- Ghost button: transparent, `--ink-soft`, 44px tall (respect 44px min hit target).

---

## Screens / Views
Screens are grouped into 5 sections (the section dividers in the reference). Exact markup for every screen is in **`dropped-screens.js`** (`window.DROPPED_SECTIONS` — an array of `{ id, title, subtitle, screens:[{ id, label, html }] }`). The `html` is the full inner markup of the `.phone` element. Use it as the structural source of truth.

### Section 1 — "A fun take on the Welcome"
1. **Welcome** (`01-welcome-fun`) — wall of handwritten/wax-sealed notes behind a hero: handwritten "psst —" kicker, big serif "Dropped" wordmark with hand-drawn underline, italic lede, **Start exploring** primary + a round wax "drop" button.
2. **How it works** (`02-how-it-works-fun`) — "Three simple rules" on torn-ticket cards (1 Walk the city · 2 Get within 50 meters [animated breaking seal] · 3 Drop your own), **Got it** CTA.
3. **Location** (`03-location-fun`) — "Stand here. That's the trick." Animated 50m radius rings, an *Anonymous by design* assurance stamp, **Allow while using the app** + **Not now**.
4. **Map / in range** (`04-map-fun`) — live map with sealed pins, a "you're within range" range-card, drop FAB, layers FAB, bottom tab bar (Map · Trail · You).
5. **Walk closer** (`05-walk-closer-fun`) — bottom sheet for an *out-of-range* secret: compass needle, big distance (335 m), address tag, blurred sealed preview, **Walk here to unlock** + **Save for later**.

### Section 2 — "Opening & reading a secret"
6. **Opening** (`06-opening-fun`) — the wax seal cracks: rays, shards, "snap!" — celebratory reveal moment.
7. **The secret** (`07-the-secret-fun`) — the confession card (washi tape, place + emotion tag, serif quote, "288 have stood here too"), **Save to collection** + heart.

### Section 3 — "Leaving one of your own"
8. **Composer** (`08-composer-fun`) — "What happened here?" write-sheet with live caret, character count, emotion chips (joy/ache/trouble/wonder), **Drop here · forever**.
9. **It's here now** (`09-it-s-here-now-fun`) — sealed-drop confirmation with live rings + "sealed!" stamp, **Walk away** / **Drop another**.

### Section 4 — "Everywhere you've wandered"
10. **Your trail** (`10-your-trail-fun`) — stats as a torn receipt, Found/Saved/Dropped tabs, a feed of unlocked secret cards.
11. **You** (`11-you-fun`) — anonymous "passport" (device id, "verified nobody" stamp), settings rows (map style, unlock radius, notifications), handwritten house rules.

### Section 5 — "Walking a secret into range"
12. **Approaching** (`04a-map-approaching-fun`) — route map, footstep trail, "78 m to go", locked find-card (out of range).
13. **In range** (`04b-map-in-range-fun`) — crossing the 50m line: ripple, "you're in range", unlocked find-card.
14. **Standing on it** (`04c-map-reached-fun`) — "you made it!", **Break the seal** button on the find-card.

---

## Interactions & Behavior
- **Core rule:** a secret is only readable when the device is physically within the unlock radius (default **50 m**). Out of range = sealed preview + "walk here"; in range = "break the seal".
- **Seal break:** the two wax halves split apart with a glow + shards (see `.seal-break`, `.break-stage` in CSS). ~0.9–1s celebratory animation, then the secret content.
- **Map pins:** sealed pins render as small lock/wax glyphs; the user's position pulses (concentric rings).
- **Composer:** emotion is a single-select chip group; the card shows a live character count and a blinking caret.
- **Ambient motion:** notes float gently, radius rings pulse, compass needle settles. All looping animations are pure CSS. A `body.no-motion *{animation:none}` switch exists for reduced-motion.
- **Entrance reveal:** one-time on first load, gated behind `body.intro-active` (`fadeUp` / `settleCh` keyframes). Steady state is always fully visible — don't make content depend on the intro running.
- **Tab bar:** Map · Trail · You, fixed bottom, active tab in sage.

## State Management
Minimum state the implementation needs:
- Current GPS position + per-secret distance → derived `inRange` boolean (radius configurable, default 50 m).
- Secret model: `{ id, lat, lng, text, emotion, droppedAt, foundCount, sealed }`.
- User trail: found[], saved[], dropped[] collections; aggregate stats (steps, cities, streak).
- Anonymous identity: a stable per-device id, **no** account/profile.
- Composer draft: text + selected emotion.
- Settings: map style, unlock radius, notification mode, reduced-motion.

## Assets
- **No raster assets / no real map tiles.** The city maps, route map, status-bar glyphs, and the phone-chrome are all **inline SVG generated in `dropped-decorate.js`** (`window.__decorateDropped(root)` fills `[data-map]`, `[data-status]`, `[data-routemap]`, `[data-routeline]`, and splits `[data-word]`). In a real app, swap these placeholder SVGs for your actual map provider (Mapbox/Apple/Google) styled to match the sage-on-paper palette; keep the seal/pin glyphs.
- All icons are inline stroke SVGs in the markup.
- Fonts: Google Fonts (Newsreader, Geist, Geist Mono, Caveat).

## Files
- **`dropped.css`** — the full design system + every component style. **Authoritative.**
- **`dropped-screens.js`** — exact markup for all 14 screens (`window.DROPPED_SECTIONS`).
- **`dropped-decorate.js`** — inline-SVG generators for map/status/route chrome (placeholders to replace with a real map).
- **`Dropped Onboarding.html`** — the linear, scrollable prototype (all screens in rails). Uses `dropped.css` + `dropped.js`.
- **`Dropped Canvas.html`** + `dropped-canvas-app.jsx` + `design-canvas.jsx` — the pan/zoom review canvas (presentation tooling only; **not** part of the product to build).
- `dropped.js` — chrome/SVG injection + rail-fitting used by the linear prototype.

To preview: open either `.html` file in a browser. All files sit flat in this folder and reference each other by relative path, so keep them together. (The canvas file uses React via CDN; an internet connection is needed for first load.)
