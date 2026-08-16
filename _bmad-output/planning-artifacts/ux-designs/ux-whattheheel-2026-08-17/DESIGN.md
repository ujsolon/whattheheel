---
name: 'What the Heel'
description: 'AI shoe virtual try-on web app. Dark, neon, drop-culture streetwear energy for a Gen-Z-native trend feed and AI Stylist — hype where it sells the trend, plain and calm the instant something needs fixing.'
status: draft
created: '2026-08-17'
updated: '2026-08-17'
colors:
  # Core palette — extracted verbatim from .working/direction-bold-streetwear.html
  ink: '#0A0A0A'
  ink-raised: '#151515'
  paper: '#FFFFFF'
  lime: '#D4FF3F'
  pink: '#FF3EC9'
  purple: '#7B2FF7'
  orange: '#FF7A1A'
  # Gradient accent set — used only inside card imagery / VTO backdrop gradients, never as flat UI fills
  blue: '#3E6BFF'
  teal: '#00D1B2'
  yellow: '#FFD23F'
  # Text roles
  on-ink: '#FFFFFF'
  on-paper: '#0A0A0A'
  border-ink: '#0A0A0A'
  # Addition beyond the mockup: the direction file has no error/negative state.
  # Kept inside the same saturated-on-black neon language (not a muted "safe" red)
  # so it still reads as this app, not a bootstrap alert.
  error: '#FF4D4D'
typography:
  # Family stack is the mockup's own literal stack — Arial Black / Arial / Helvetica Neue.
  # This is a hackathon placeholder system stack, not a licensed display face; swap-safe.
  display:
    fontFamily: "'Arial Black', Arial, 'Helvetica Neue', sans-serif"
    fontSize: 26px
    fontWeight: '900'
    lineHeight: '1'
    letterSpacing: -0.02em
  heading:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: 13px
    fontWeight: '900'
    lineHeight: '1.15'
    letterSpacing: '0'
  label:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: 11px
    fontWeight: '900'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  marquee:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: 11px
    fontWeight: '900'
    lineHeight: '1.2'
    letterSpacing: 0.15em
  meta:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: 10px
    fontWeight: '800'
    lineHeight: '1.3'
    letterSpacing: 0.02em
  # Addition beyond the mockup: the direction file only ever sets headline/label
  # typography. Body is needed for forms, error copy, and instructional text.
  body:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
rounded:
  sm: 0px
  DEFAULT: 0px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  section: 64px
components:
  trend-card:
    background: '{colors.paper}'
    foreground: '{colors.on-paper}'
    border: '3px solid {colors.border-ink}'
    shadow: '4px 4px 0 {colors.border-ink}'
    radius: '{rounded.sm}'
  trend-card-selected:
    outline: '4px solid {colors.lime}'
    shadow: '4px 4px 0 {colors.lime}'
  trend-card-loading:
    background: 'repeating-linear-gradient(110deg, #E7E7E7 0 10px, #D2D2D2 10px 20px)'
    foreground: 'transparent'
  badge:
    background: '{colors.lime}'
    foreground: '{colors.on-paper}'
    border: '2px solid {colors.border-ink}'
    radius: '{rounded.sm}'
  badge-fire:
    background: '{colors.orange}'
    foreground: '{colors.on-paper}'
    border: '2px solid {colors.border-ink}'
    radius: '{rounded.sm}'
  marquee:
    background: '{colors.ink}'
    foreground: '{colors.lime}'
    border-top: '2px solid {colors.lime}'
    border-bottom: '2px solid {colors.lime}'
  nav-tab-bar:
    background: '{colors.ink}'
    border-top: '3px solid {colors.border-ink}'
  nav-tab-bar-item-active:
    background: '{colors.lime}'
    foreground: '{colors.on-paper}'
    border: '3px solid {colors.border-ink}'
    shadow: '3px 3px 0 {colors.pink}'
    radius: '{rounded.sm}'
  nav-tab-bar-item-inactive:
    background: '{colors.ink}'
    foreground: '{colors.lime}'
    border: '3px solid {colors.border-ink}'
    radius: '{rounded.sm}'
  buy-now-button:
    background: '{colors.lime}'
    foreground: '{colors.on-paper}'
    border: '3px solid {colors.border-ink}'
    shadow: '5px 5px 0 {colors.pink}'
    radius: '{rounded.sm}'
  overlay-canvas:
    background: '{colors.ink-raised}'
    border-empty: '3px dashed {colors.lime}'
    border-loaded: 'none'
    radius: '{rounded.sm}'
  overlay-canvas-handle:
    background: '{colors.lime}'
    border: '2px solid {colors.border-ink}'
    radius: '{rounded.full}'
  vto-result-photo:
    border: '3px solid {colors.lime}'
    background: 'linear-gradient(160deg, {colors.blue}, {colors.purple} 55%, {colors.pink})'
    radius: '{rounded.sm}'
  upload-dropzone:
    background: '{colors.ink-raised}'
    border: '3px dashed {colors.lime}'
    foreground: '{colors.on-ink}'
    radius: '{rounded.sm}'
  input-field:
    background: '{colors.ink-raised}'
    foreground: '{colors.on-ink}'
    border: '3px solid {colors.border-ink}'
    border-focus: '3px solid {colors.lime}'
    radius: '{rounded.sm}'
  inline-error:
    background: '{colors.ink-raised}'
    foreground: '{colors.on-ink}'
    border: '3px solid {colors.error}'
    radius: '{rounded.sm}'
  vto-progress-bar:
    track-background: '{colors.ink-raised}'
    track-border: '3px solid {colors.border-ink}'
    fill: '{colors.lime}'
    height: 12px
    radius: '{rounded.sm}'
  auth-form:
    background: '{colors.ink-raised}'
    foreground: '{colors.on-ink}'
    border: '3px solid {colors.border-ink}'
    shadow: '4px 4px 0 {colors.border-ink}'
    radius: '{rounded.sm}'
  focus-ring:
    color: '{colors.lime}'
    width: 3px
    offset: 2px
---

## Brand & Style

What the Heel is built to feel like a drop, not a catalog. The premise is that trend discovery is entertainment first — footwear judges browse the way they'd scroll a hype account, and the interface should match that register: loud color-blocked gradients, tilted stickers, an auto-scrolling marquee ticker, and shouty all-caps type. Every surface commits to near-black backgrounds punched through with acid neon — nothing pastel, nothing soft, nothing that could be mistaken for a calm inventory grid.

The direction is deliberately maximalist where it's selling a trend (the feed, badges, the "you. heeled." result reveal) and deliberately plain where it's telling the user something went wrong (validation, VTO failure). That split is intentional, not a lapse in brand discipline — see Do's and Don'ts and `EXPERIENCE.md`'s Voice and Tone for the full reasoning. Visually this shows up as the same dark/neon canvas everywhere, but hype typography and stickered shadows only ever wrap positive or neutral content; error surfaces stay on the same palette with none of the tilt, badge, or marquee flourishes.

Dark mode is not a setting here — it is the only mode. There is no light theme, no toggle, and no code path that should ever render a light background.

`.working/direction-bold-streetwear.html` (the chosen direction from Discovery) is the composition reference for the feed hero and the sticker/marquee treatment — but this spine wins on any conflict between the two. The mockup's phone-bezel device chrome and its one-off −6deg display-type skew are illustrative, not tokens; see Shapes and Typography for what's actually specified.

## Colors

- **Ink (`{colors.ink}` #0A0A0A)** is the base canvas everywhere — the phone-shell background, the tab bar, the VTO result wrapper. Near-black rather than pure black so neon accents still read as "glowing," not just bright-on-void.
- **Ink Raised (`{colors.ink-raised}` #151515)** is one step up from ink — used for the feed grid well, the CTA row, upload dropzones, and form inputs. It tells the eye "this is a distinct zone" without introducing a second hue.
- **Paper (`{colors.paper}` #FFFFFF)** is reserved for card surfaces that need to hold a product photo and read as a physical sticker sitting on top of the ink canvas — trend cards, primarily. Never used as a page background.
- **Lime (`{colors.lime}` #D4FF3F)** is the primary accent and the app's single "go" signal — the Buy Now fill, the active tab, the "HOT" badge, the selected-card outline, focus rings, and marquee text. If something is actionable and primary, it's lime. Not used decoratively or repeated more than once per screen as a large fill.
- **Pink (`{colors.pink}` #FF3EC9)** is the secondary accent, used almost exclusively as offset "sticker" shadow color behind lime elements and inside gradient card imagery. Not used for text at small sizes — on ink it passes (6.4:1), but on `{colors.paper}` it fails (3.1:1), and since cards are the one place pink runs near text, the rule is a flat ban rather than a surface-by-surface exception.
- **Purple (`{colors.purple}` #7B2FF7)** is the tertiary accent: gradient imagery, the tagline gradient bar, and doubles as the meta/caption text color on paper cards (e.g. "worn by @itgirl.era"). It is the one accent allowed as small text, on paper only.
- **Orange (`{colors.orange}` #FF7A1A)** means "trending right now" exclusively — the fire-count badge. Never used for anything else; introducing it elsewhere would dilute the one signal it carries.
- **Blue, Teal, Yellow (`{colors.blue}` #3E6BFF, `{colors.teal}` #00D1B2, `{colors.yellow}` #FFD23F)** exist only inside gradients used as placeholder/decorative imagery fills (card thumbnails, the VTO result backdrop). Never used as flat UI fills, borders, or text.
- **On-Ink (`{colors.on-ink}` #FFFFFF)** and **On-Paper (`{colors.on-paper}` #0A0A0A)** are the two text colors in the system. Every text run sits on ink or on paper/lime — there is no third "muted gray" text color; de-emphasis is done with size and weight, not opacity.
- **Border-Ink (`{colors.border-ink}` #0A0A0A)** is the thick structural border used on nearly every discrete surface (cards, badges, buttons, inputs, the tab bar). It's what makes the flat color blocks read as cut-out stickers rather than borderless divs.
- **Error (`{colors.error}` #FF4D4D)** is the one color not present in the direction mockup, added because every real product needs a failure state and this one doesn't render any. It stays inside the neon-on-ink language (saturated, legible on `{colors.ink-raised}`) rather than reaching for a muted "safe" alert red — but it is used only for the error border/icon, never for hype flourishes like tilt, stickers, or shadow-offset.

Avoid: pastels, muted/desaturated variants of any accent, gradients as flat UI backgrounds (gradients are for imagery only), gray text, light-mode variants of any token.

**Contrast, load-bearing pairs (WCAG contrast ratio, dark-mode-only so no light-mode column needed):**

| Pair | Ratio | Use |
|---|---|---|
| `{colors.lime}` on `{colors.ink}` | 17.13:1 | Active tab, marquee text |
| `{colors.on-paper}` on `{colors.lime}` | 17.13:1 | Buy Now, badge, HOT |
| `{colors.on-ink}` on `{colors.ink-raised}` | 18.26:1 | Form/body text on raised zones |
| `{colors.lime}` on `{colors.ink-raised}` | 15.80:1 | Focus rings, dropzone border |
| `{colors.purple}` meta text on `{colors.paper}` | 5.85:1 | Card attribution captions |
| `{colors.error}` on `{colors.ink-raised}` | 5.58:1 | Inline error border/copy |
| `{colors.on-paper}` on `{colors.orange}` | 7.59:1 | `badge-fire` |
| `{colors.pink}` on `{colors.ink}` | 6.4:1 | (shadows only — see above; never body text) |
| `{colors.pink}` on `{colors.paper}` | 3.1:1 — fails | (never used for text; shadow/badge only) |

## Typography

Family is a plain system stack — `'Arial Black', Arial, 'Helvetica Neue', sans-serif` for display weight, `Arial, 'Helvetica Neue', sans-serif` for everything else — deliberately unlicensed and swap-safe for a hackathon build; the voice comes from weight, case, and tracking, not from a bespoke typeface.

- **Display (`{typography.display}`)** — the wordmark and screen-level headers ("What the Heel?!", "You. Heeled."). Always uppercase, tight negative tracking, weight 900. The mockup skews these −6deg via CSS transform; that's a one-off hero treatment, not something to apply to every heading.
- **Heading (`{typography.heading}`)** — card titles, the VTO shoe name, section titles. Uppercase, weight 900, no tracking.
- **Label (`{typography.label}`)** — button and pill text, tab bar labels, tags. Uppercase, tracked (+0.05em), weight 900 — always short (1-4 words).
- **Marquee (`{typography.marquee}`)** — the ticker only. Widest tracking in the ramp (+0.15em) because it's read at a glance while scrolling past.
- **Meta (`{typography.meta}`)** — card sublines, timestamps, attribution ("worn by @itgirl.era"). Weight 800 but smaller and never uppercase-forced — this is the one role allowed sentence case.
- **Body (`{typography.body}`)** — form labels, helper text, error copy, any instructional sentence. Weight 400, sentence case, no letter-spacing. This is the "plain register" role — see Brand & Style. Never set body text in Display or Label.

Rule: uppercase is reserved for Display/Heading/Label/Marquee (the hype register). Body and Meta are always sentence case. This is how a reader can feel the register shift from "hype" to "plain" before they've even parsed the words.

## Layout & Spacing

Scale: `{spacing.1}` 4px through `{spacing.6}` 32px, plus a named `{spacing.section}` (64px) for outer page padding only. Tight internal padding (`{spacing.2}`–`{spacing.3}`) inside cards and pills keeps the sticker-cluster feel; the only generous gap in the system is `{spacing.section}`, reserved for the top/bottom edges of a scrolling page — never between cards, which should feel packed and busy.

Mobile is the base layout: single content column, `{spacing.4}` side padding, 2-column trend grid with `{spacing.2}` gutters. Desktop (`lg`, 1024px+) widens the trend grid to 3-4 columns and swaps the bottom tab bar for a top nav bar (see `EXPERIENCE.md` Responsive & Platform for the full breakpoint behavior — this file governs appearance only). Content that isn't a grid (the VTO result, the overlay canvas, forms) stays capped at a phone-proportioned column (480px) even on desktop, centered on the ink canvas — echoing the mockup's own phone-frame device shell rather than stretching sticker-shadowed cards across a wide viewport.

## Elevation & Depth

There is no blurred shadow anywhere in this system. Depth is communicated entirely through hard-edged, fully-opaque offset shadows in an accent color — the "sticker" effect: `4px 4px 0 {colors.border-ink}` under a trend card, `5px 5px 0 {colors.pink}` under the Buy Now button, `3px 3px 0 {colors.pink}` under the active tab bar item. The offset direction is always down-right, the blur radius is always 0, and the shadow color is always a flat accent or `{colors.border-ink}` — never black-with-opacity.

Selected/active state raises the stakes rather than the shadow: a trend card that's selected swaps its shadow color to `{colors.lime}` and adds a 4px lime outline, rather than growing the shadow offset. Reserve a larger offset (8-10px, seen on the device-frame chrome in the mockup) for at most one hero element per screen — using it everywhere flattens the hierarchy it's meant to create.

## Shapes

Corners are square everywhere in the product UI — `{rounded.sm}` and `{rounded.DEFAULT}` are both 0px. Cards, badges, pills, buttons, and inputs all use hard rectangular corners with a thick `{colors.border-ink}` outline; this is what reads as "sticker/label," not the phone-bezel rounding seen in the mockup frame (that rounding is mockup device chrome, not app UI, and is not part of this token set). `{rounded.full}` (9999px) exists only for the overlay canvas's drag/scale/rotate handles and any future circular avatar — the single deliberate exception, used to make a touch target unambiguously grabbable.

Imagery is always cropped to its container's square corners; never round an image corner independently of its card.

## Components

- **Trend card (`{components.trend-card}`)** — `{colors.paper}` background, 3px `{colors.border-ink}` border, `{components.trend-card.shadow}`. Holds a shoe photo, an optional top-left `{components.badge}` (HOT/NEW) or top-right `{components.badge-fire}` (🔥 count), a `{typography.heading}` name, and a `{typography.meta}` subline. Selected state applies `{components.trend-card-selected}` (lime outline + lime shadow) plus a bottom ribbon reading "SELECTED" in `{typography.label}` on `{colors.ink}`/`{colors.lime}`. Loading state applies `{components.trend-card-loading}` — a diagonal-striped skeleton fill, text areas rendered as filled bars with no visible copy.
- **Badge (`{components.badge}` / `{components.badge-fire}`)** — small, rotated -4deg, 2px border, always 1-2 words in `{typography.label}` case rules. Corner-pinned to a card, never centered.
- **Marquee (`{components.marquee}`)** — full-bleed ticker strip directly under the top bar on the feed. `{typography.marquee}` text, lime-bordered top/bottom rules, continuous horizontal auto-scroll.
- **Nav tab bar (`{components.nav-tab-bar}`)** — mobile: fixed bottom bar, 3px top border, holds exactly 3 items (Feed / AI Stylist / Profile). Active item uses `{components.nav-tab-bar-item-active}` (lime fill, pink sticker shadow); inactive items use `{components.nav-tab-bar-item-inactive}` (ink fill, lime text, bordered but shadowless). Desktop swaps this to a top bar — see `EXPERIENCE.md`.
- **Buy Now button (`{components.buy-now-button}`)** — full-width lime fill, `{colors.border-ink}` border, pink sticker shadow, `{typography.label}` text, always phrased as a short punchy imperative ("Heel Yes — Buy Now →"). Hidden entirely (not disabled/grayed) when the trend has no `buyUrl`.
- **Overlay canvas (`{components.overlay-canvas}`)** — the FR-02 manual try-on surface. Empty state: `{colors.ink-raised}` fill with a dashed lime border prompting photo selection. Loaded state: border removed, canvas fills with the user's foot photo, shoe image layered on top with `{components.overlay-canvas-handle}` grab points (lime filled circles, dark border) at the corners for scale/rotate.
- **VTO result photo (`{components.vto-result-photo}`)** — solid 3px lime border around the AI-generated image; while no real image exists yet in this artifact set, the placeholder gradient (`{colors.blue}` → `{colors.purple}` → `{colors.pink}`) shown in the mockup is acceptable as a dev-time stand-in. Paired below with a `{typography.heading}` shoe name + `{typography.heading}` price row and the Buy Now button.
- **Upload dropzone (`{components.upload-dropzone}`)** — shared visual pattern for selfie upload and (conceptually) the overlay's foot-photo picker: dashed lime border on `{colors.ink-raised}`, centered `{typography.body}` instruction text, a filename/thumbnail chip once a file is chosen.
- **Input field (`{components.input-field}`)** — registration/login text inputs: `{colors.ink-raised}` fill, solid dark border, border swaps to solid lime on focus (paired with `{components.focus-ring}`). Label sits above in `{typography.label}`, sentence-case placeholder in `{typography.body}`.
- **Focus ring (`{components.focus-ring}`)** — 3px `{colors.lime}` outline, 2px offset, applied on keyboard focus to every interactive element in the system. Reuses the palette's one "go/selected" color rather than a separate default-browser blue, so focus reads as consistent with the rest of the design language. Behavioral trigger conditions (keyboard-only, not on pointer focus) live in `EXPERIENCE.md` Accessibility Floor.
- **Inline error (`{components.inline-error}`)** — `{colors.ink-raised}` panel with a solid `{colors.error}` border (not dashed, not shadowed, no tilt — deliberately calmer than every other component here). Renders on the same screen as the failure, never a modal. `{typography.body}` copy exactly as specified in `EXPERIENCE.md` Voice and Tone, plus a text-only "Try another photo" action styled as an underlined `{typography.label}` link in `{colors.on-ink}` — not a lime button, so it doesn't compete visually with a "go" action.
- **VTO progress bar (`{components.vto-progress-bar}`)** — full-width indeterminate bar on the polling screen: `{colors.ink-raised}` track with a solid dark border, `{colors.lime}` fill sweeping left-to-right on loop, square ends. Rotating status copy sits directly below in `{typography.body}`, plain register — this is a wait, not a celebration, so no tilt, marquee, or sticker shadow.
- **Auth form (`{components.auth-form}`)** — the registration/login panel: `{colors.ink-raised}` card with a solid dark border and a flat offset shadow, holding stacked `{components.input-field}` rows. Submit is the screen's single lime action; the sign-up/sign-in toggle sits below it as an underlined `{typography.label}` link, never a second button.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep the canvas dark (`{colors.ink}`/`{colors.ink-raised}`) on every screen, no exceptions | Introduce a light background anywhere, even for forms or errors |
| Use flat, fully-opaque offset shadows only | Use blurred/soft box-shadows or drop-shadow filters |
| Reserve lime for the single primary action or "selected" state per screen | Use lime as a general decorative accent or repeat it as two competing CTAs on one screen |
| Keep error/validation surfaces in `{typography.body}`, sentence case, undecorated | Wrap error copy in Display/Label uppercase treatment, tilt, stickers, or a sticker shadow |
| Square corners everywhere except grab handles | Round card, button, or input corners "to soften" the aesthetic |
| One hype flourish (tilt, marquee, sticker shadow) per screen region | Stack tilt + marquee + oversized shadow on the same element |
| Use purple only for gradient imagery and paper-card meta text | Use purple or pink for body copy, form labels, or error text |
