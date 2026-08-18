---
name: 'What the Heel'
description: 'AI shoe virtual try-on web app — anonymous trend discovery with a manual overlay preview, staged into a registered AI Stylist flow with real YouCam virtual try-on and retail links.'
status: draft
created: '2026-08-17'
updated: '2026-08-17'
design_ref: 'DESIGN.md'
sources:
  - '_bmad-output/planning-artifacts/prds/prd-whattheheel-2026-08-10/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
---

# What the Heel — Experience Spine

> Mobile-first responsive web. Dark mode only. Visual identity in `DESIGN.md` (Bold Streetwear direction). This spine is the behavior.

## Foundation

Mobile-first responsive web, single Next.js app (no native shell). No UI system is named — this is Tailwind CSS v4 utility classes only, no shadcn/MUI/internal component library underneath; every component in `DESIGN.md.components` is bespoke to this product. Dark mode is not a setting — it is the only theme; there is no light-mode code path to maintain.

Two access tiers gate the experience, not two separate apps: **anonymous** (Trendsetter Feed + manual overlay preview, fully client-side, zero backend cost per architecture AD-3) and **registered** (selfie on file, real AI Stylist virtual try-on via YouCam, retail links). The product's entire funnel logic is "get an anonymous visitor far enough into the manual preview that registering for the real thing feels like the obvious next tap" (PRD NFR — UX, per `epics.md`'s numbering).

## Information Architecture

Three bottom-tab surfaces (mobile) / top-nav surfaces (desktop, see Responsive & Platform): **Feed**, **AI Stylist**, **Profile** — matching the architecture's own page-route comment (`(page routes)/ # Trendsetter feed, stylist, profile`).

| Surface | Reached from | Purpose | Gate |
|---|---|---|---|
| Feed (Trendsetter Feed) | App open (default landing, any user) | Curated trend gallery (FR-01) | None — anonymous OK |
| Feed → Overlay Preview | Tap a trend card → "Try It On" | Manual drag/scale/rotate overlay of the shoe onto the user's own foot photo (FR-02), client-side only | None — anonymous OK |
| Feed → Overlay Preview → Registration CTA | Shown after any overlay interaction | Invites registration to unlock the AI Stylist (PRD Journey 1 step 4) | — |
| Registration / Login | Registration CTA, or tapping AI Stylist while signed out | Email + password sign-up/sign-in via NextAuth `CredentialsProvider` (FR-03, architecture AD-7) — no OAuth button, no adapter | — |
| Profile | Bottom/top nav | Account summary, selfie on file, Past Try-Ons history (Story 2.6), sign out | Requires login |
| Profile → Past Try-Ons → Full Image Viewer | Tap a history tile | Full-screen zoomable view of one past result (Story 2.7) — amends Story 2.6's original view-only tiles | Requires login |
| Profile → Selfie Upload | Profile ("add/change photo"), or first AI Stylist visit with no selfie saved | Upload + server-validate a selfie for digital fitting (Story 2.2, AD-5) | Requires login |
| AI Stylist (trend + trigger) | Bottom/top nav | Pick a trend (carried over from Feed selection or chosen fresh) and trigger high-fidelity VTO (FR-04) | Requires login + saved selfie |
| AI Stylist → VTO Polling | Immediately after trigger | Status/progress state while YouCam infers (PRD NFR — Performance, per `epics.md`'s numbering) | — |
| AI Stylist → VTO Result | Polling resolves `success` | High-fidelity try-on image + shoe name/price + Buy Now (FR-04, FR-05) | — |
| AI Stylist → VTO Failure (inline) | Polling resolves `error` | Inline error per code + "try another photo" (FR-06, AD-6) | — |

Gating rule: tapping **AI Stylist** while signed out routes straight to Registration/Login (not a locked/teaser screen); once logged in with no selfie on file, it routes straight to Selfie Upload before showing the trend/trigger screen. Neither gate is a dead-end modal — both resolve back into the AI Stylist flow once satisfied.

**No style picker anywhere:** `VTO_TASK.style` always carries a single fixed default value, so the AI Stylist trend/trigger screen offers trend selection only. (`epics.md` Story 2.3 has been updated to match.)

## Voice and Tone

Two deliberate registers, not an inconsistency. Aesthetic posture lives in `DESIGN.md`; this table is the words.

**Hype register** — feed, badges, CTAs, the VTO result reveal. Drop-culture slang, exclamation-forward, shoe puns, all-caps where `DESIGN.md` typography calls for it. Lifted directly from `.working/direction-bold-streetwear.html` (the chosen direction)'s own copy:

| Do (hype register — discovery & celebration only) | Don't |
|---|---|
| "TRENDING RN 🔥" | "Popular items" |
| "This is giving main character energy" | "Your try-on is complete" |
| "Heel Yes — Buy Now →" | "Purchase" |
| "You. Heeled." | "Try-On Result" |
| "NEW DROPS DAILY ★ Y2K IS BACK ★ COP BEFORE IT'S GONE" (marquee) | Plain trend-list captions |

**Plain register** — anything transactional, instructional, or a failure. This is the deliberate tension: the brand voice above is loud, but the moment something needs the user to *do* something correctly (fix a photo, understand why a step failed), hype language reads as tone-deaf and erodes trust exactly when clarity matters most. So form labels, upload instructions, and every error message drop out of the hype register entirely — no puns, no exclamation points, no all-caps.

The six VTO failure strings are **locked content** from the PRD (FR-06) and architecture AD-6 — quoted verbatim, never rewritten to match the louder voice elsewhere, and never varied per call site (AD-6: "fixed handling in exactly one place"):

| Error code | Locked copy (verbatim) |
|---|---|
| `error_no_face` | "We couldn't detect a face — try a front-facing selfie with good lighting." |
| `error_download_image` | "We couldn't load one of the images — please try uploading again." |
| `error_inference` | "Something went wrong generating your preview — please try again." |
| `error_nsfw_content_detected` | "This image can't be used — please choose a different photo." |
| `exceed_max_filesize` | "That image is too large (max 10MB) — please choose a smaller file." |
| `invalid_parameter` | Not user-facing. Logged server-side only; the user sees the `error_inference` copy above (AD-6). |

Selfie-upload validation errors (Story 2.2, e.g. wrong format/dimensions) aren't in the locked table but follow the same plain-register pattern by extension: state what was wrong and what to do next, one sentence, no hype.

## Component Patterns

Behavioral specs. Visual specs live in `DESIGN.md.components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Registration / Login form (`{components.auth-form}`) | Registration / Login | Two forms sharing one screen (toggle link between them, no OAuth button anywhere — architecture AD-7): **Sign up** — email + password fields (`{components.input-field}`), submit creates the account via `POST /api/auth/register` (bcryptjs-hashed server-side) then signs in immediately. **Sign in** — email + password fields, submits via NextAuth `CredentialsProvider`. Both: password field is `type="password"`, no strength meter (hackathon scope), inline plain-register error below the form on failure ("That email's already registered — sign in instead?" / "Email or password didn't match — try again."), never a field-by-field red-underline treatment beyond the one summary message. |
| `OverlayCanvas.tsx` (`{components.overlay-canvas}`) | Feed → Overlay Preview | Client-only, no network call (AD-3). Pointer-drag repositions the shoe layer in real time. Scale via a slider control + pinch-gesture on touch. Rotate via a slider control (-45°…45°) + on-screen ±15° buttons — no gesture-only controls, every transform has a discrete-step fallback (see Accessibility Floor). A "Reset" action returns the shoe to its default centered position/scale/rotation. Foot photo and shoe image are both `<img>`/canvas layers held only in component state — never uploaded. |
| Trend feed card (`{components.trend-card}`) | Feed grid | Tap opens Overlay Preview with that trend pre-loaded. Long-press/hover: none (no secondary action). Badge shows at most one of HOT / NEW / a 🔥 fire-count badge (e.g. "🔥 12") — never stacked. |
| "Choose fresh" trend picker (`{components.trend-card}`, reused) | AI Stylist (trend + trigger), when no trend was carried over from Feed | A compact inline grid reusing `{components.trend-card}` at a smaller size — not a new component — scoped to the AI Stylist screen itself, so the user never has to leave it to pick a trend. Selecting one applies the same `{components.trend-card-selected}` treatment as the Feed. |
| Upload control (`{components.upload-dropzone}`) | Selfie Upload; foot-photo picker inside Overlay Preview | No custom camera UI (memlog decision). Selfie path: native `<input type="file" accept="image/jpeg,image/png">`; server validation accepts decoded JPG/JPEG or PNG before any Cloudinary upload (AD-5), while client checks remain UX hints only. Guidance reads `Use a clear, front-facing solo photo from the top of your head to your chest. JPG or PNG; at least 512 × 512px; under 10MB.` Wrong-format copy is `Use a JPG or PNG image.` On failure, the user stays on the same screen and picks a new file. The anonymous foot-photo picker retains `<input type="file" accept="image/*">` because it is client-only and browser-decoded. |
| VTO polling / loading state | AI Stylist → VTO Polling | **Concretizes what the architecture left deferred.** `GET /api/vto-tasks/[id]` polls every 2s. The screen shows a full-width indeterminate progress bar (`{components.vto-progress-bar}`) plus rotating status copy that cycles every ~3s through a short fixed list ("Lacing up your fit…" → "Blending the shadows…" → "Almost heeled…" → loops), styled in `{typography.body}` (plain register — this is a wait state, not a celebration, even though it's not an error). Past 30s elapsed, an additional fixed line appears below the cycling copy: "Still working — hang tight." No cancel action in v1 (hackathon scope). See State Patterns for what happens on a failed poll or an unbounded wait — this row covers the happy path only. |
| Marquee ticker | Feed (top of page) | Auto-scrolling, continuous loop, real trend copy (never lorem). Pauses on hover/focus (desktop) and on `prefers-reduced-motion` (see Accessibility Floor) rather than looping indefinitely regardless of user preference. |
| VTO result display (`{components.vto-result-photo}`) | AI Stylist → VTO Result (the architecture's "stylist result component") | Full-bleed result image inside `{components.vto-result-photo}`, hype-register header line above it, shoe name + price row below, Buy Now beneath that. Renders only on `status: success`. |
| Inline error component (`{components.inline-error}`) | AI Stylist → VTO Failure | Renders inline on the **same screen** as the trigger/result, never a modal (FR-06, AD-6). Shows the exact locked copy for the returned code (see Voice and Tone). Always includes a "Try another photo" text action that re-opens the Selfie Upload control in place — the user doesn't leave the AI Stylist surface to retry. |
| Buy Now link (`{components.buy-now-button}`) | VTO Result | Renders only when the trend's `buyUrl` is present; **hidden entirely** (not disabled/grayed) when absent — never a dead or broken-looking link (Story 2.5). Opens in a new tab (`target="_blank" rel="noopener"`). |
| Bottom tab bar / top nav (`{components.nav-tab-bar}`) | Global, all surfaces | 3 items always in the same order: Feed, AI Stylist, Profile. Active item visually distinct per `DESIGN.md`. Tapping the current surface's own tab is a no-op (no reload/reset of scroll position). |
| Past Try-Ons history grid (`{components.vto-history-grid}`) | Profile | View-only grid of past successful try-ons (Story 2.6): result image + trend label, most recent first. Renders nothing at all (no section, no empty-state box) when the user has zero history. Each tile opens the Full Image Viewer on tap (Story 2.7). |
| Full Image Viewer (`{components.vto-result-viewer}`) | Profile → Past Try-Ons | Full-screen, non-blocking content viewer for one history result — see the "modal" clarification under Interaction Primitives for why this is not covered by the no-modals rule. Pinch-to-zoom (touch) or a visible slider + `+`/`-` buttons (1x–3x), drag-to-pan once zoomed past 1x. Closes via Escape, a visible close control, or tapping the backdrop outside the image — never by tapping the image itself. Focus moves into the viewer on open, is trapped within it while open, and returns to the originating tile on close. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Empty (no trends) | Feed | Fallback message in plain register: "No trends right now — check back soon." Same treatment covers `trends.json` failing to load entirely — the failure mode is invisible to the user either way, only the cause differs. |
| Loading (feed) | Feed | Skeleton cards (`{components.trend-card-loading}`) in place of real cards while `trends.json` is fetched/rendered |
| Loading (polling) | AI Stylist → VTO Polling | See Component Patterns — progress bar + rotating status copy |
| Poll failure / lost connection | AI Stylist → VTO Polling | If a poll request itself fails (network drop, expired session returning 401), retry silently up to 3 times at the normal 2s cadence; on a 4th consecutive failure, show `{components.inline-error}` in place, plain register: "We lost the connection — tap to retry," with a retry action that resumes polling the same task. This is distinct from a YouCam `error` status, which is a successful poll carrying a failure result (see below). |
| Poll timeout | AI Stylist → VTO Polling | Past 90s elapsed with no terminal status, stop polling and show the same lost-connection `{components.inline-error}` treatment with the retry action, rather than waiting indefinitely. |
| Empty (no selfie) | AI Stylist gate | Redirects to Selfie Upload rather than rendering an empty state in place — see Information Architecture gating rule |
| No trend carried over | AI Stylist (trend + trigger) | If no trend id survives in the URL param / `sessionStorage` fallback (a direct nav-bar tap into AI Stylist, not a Feed CTA), the "choose fresh" trend picker (Component Patterns) renders in place of a pre-filled selection — never an error, since arriving with no trend selected is a normal path. |
| In progress (selfie upload / auth submit) | Selfie Upload; Registration / Login | The dropzone or submit button disables and swaps to plain-register in-progress copy ("Uploading…" / "Signing you in…") for the duration of the round-trip — guards against a double-submit on the account-creation and upload paths specifically, since both are the product's slowest server actions. |
| Error (upload validation) | Selfie Upload; Overlay Preview foot-photo picker | Inline plain-register message below the dropzone; upload does not proceed (AD-5) |
| Error (VTO failure) | AI Stylist → VTO Failure | Inline error component with locked copy + "Try another photo" (FR-06) |
| Success (overlay composed) | Feed → Overlay Preview | Registration CTA appears below the canvas once the user has interacted with drag/scale/rotate at least once (PRD Journey 1 step 4) |
| Error (registration/login) | Registration / Login | Inline plain-register message below the form: email already registered (sign-up), or credentials didn't match (sign-in) — never reveals which of email/password was wrong, to avoid account enumeration |
| Success (selfie saved) | Selfie Upload → Profile | Plain-register confirmation ("Selfie saved.") plus the thumbnail now shown on Profile |
| Success (VTO complete) | AI Stylist → VTO Result | Hype-register reveal — the one place loud copy and a locked/instructional register never mix on the same screen |
| Cold-load | Profile | Account email + selfie thumbnail (or an empty-selfie placeholder with a plain-register "No selfie yet" prompt linking to Selfie Upload) render once the session resolves; no loading skeleton needed — this is local session data, not a network fetch. |
| Sign-out | Profile | Tapping sign out clears the session immediately and returns to the signed-out Feed — no confirmation dialog (AD-6/Do's-and-Don'ts precedent: no modals in this product). |

## Interaction Primitives

- **Drag** — pointer-events-based repositioning inside `OverlayCanvas.tsx`. Works with mouse, touch, and pen input identically (no touch-only gesture).
- **Scale / Rotate** — slider + discrete-step button controls, always visible alongside the canvas (not gesture-only) so the transform is available without a pinch gesture.
- **File upload** — selfie intake uses `<input type="file" accept="image/jpeg,image/png">`; the client-only foot-photo picker uses `<input type="file" accept="image/*">`. Both are click-to-browse and use the OS chooser on mobile. No bespoke camera capture UI anywhere in the product.
- **Tab navigation** — single tap/click switches surfaces; the previously active surface's scroll position is not preserved (each surface loads fresh).
- **Carried-over trend selection** — the trend a user picked in the Feed follows them through Registration into the AI Stylist screen. Because this crosses navigations (and, for anonymous → registered, a sign-in), it is **not** component state: the selected trend id travels as a URL query param (e.g. `/stylist?trend=abc123`), with `sessionStorage` as the fallback across the auth redirect. Any surface reading it must tolerate its absence and fall back to "no trend pre-selected" rather than erroring.
- **Link behavior** — Buy Now is the only external link in the product; always opens in a new tab, never replaces the current app view.
- **Banned:** custom camera capture components, modal dialogs for VTO failure (must be inline per AD-6), a style picker (single fixed default style, no user-facing selection — see Information Architecture note), light-mode toggle.
- **What "no modals" actually covers** (clarified 2026-08-18, Story 2.7 review): the rule traces to PRD FR-06/architecture AD-6, both scoped specifically to VTO failure handling — a *decision-interrupt* pattern (a blocking dialog demanding acknowledgment before the user can continue). The sign-out row above generalizes this to "no modals in this product" by citing it as precedent for skipping a confirmation dialog, another decision-interrupt case. Neither source ever covered a non-blocking, dismiss-anywhere **content viewer** like the Full Image Viewer — it presents information, asks for no decision, and does not gate the user's ability to continue using Profile. The rule going forward: modal dialogs that interrupt a decision (errors, confirmations) are banned; non-blocking content viewers are not.

## Accessibility Floor

Reasonable baseline, not a WCAG audit (per memlog). Visual contrast values live in `DESIGN.md`; this is the behavior layer.

- Semantic HTML throughout: `<nav>` for the tab bar, real `<button>` elements for actions (never a styled `<div>`), `<form>`/`<label>` pairing on every input (registration, selfie upload).
- Contrast against the dark neon palette specifically: body/error/instructional text always renders in `{colors.on-ink}` or `{colors.on-paper}` (white-on-near-black or black-on-white/lime) — never in `{colors.pink}` at small sizes, which is reserved for shadows/badges precisely because it doesn't hold contrast well as text (see `DESIGN.md` Colors). `{colors.purple}` as meta text is paper-background only, never on ink.
- Keyboard navigation: full tab order follows visual/reading order on every surface. `OverlayCanvas.tsx` is keyboard-operable, not pointer-only — arrow keys nudge shoe position, `+`/`-` scale, `[`/`]` rotate, mirroring the on-screen slider/button controls so no interaction is drag-only.
- Alt text: every shoe image, the user's own selfie/foot-photo thumbnail, and the VTO result image carry descriptive alt text (e.g. "Chunky Platform Loafer, front angle" / "Your AI try-on result: Chunky Platform Loafer"). Decorative gradient/placeholder imagery is marked `alt=""`.
- Focus states: every interactive element shows `{components.focus-ring}` (3px lime outline, 2px offset) on keyboard focus — reusing the same lime language the design already assigns to "selected," so focus reads as consistent with the rest of the system rather than a bolted-on browser default.
- Tap targets: minimum 44×44px on all buttons, badges excluded (badges are decorative labels, not tap targets).
- `prefers-reduced-motion`: the marquee ticker holds static (shows its content, no scroll animation), the VTO polling status copy still advances but only on each poll response rather than a timed cycle, and the progress bar switches from a sweeping fill to a static indeterminate pattern. These are the product's only three continuously-animating elements, and all three respect the setting.

## Responsive & Platform

| Breakpoint | Behavior |
|---|---|
| `< lg` (below 1024px) | Mobile layout. Bottom-fixed tab bar (`{components.nav-tab-bar}`), single content column, 2-column trend grid. |
| `≥ lg` (1024px+) | Desktop layout. Bottom tab bar is replaced by a top nav bar: wordmark left, the same 3 items (Feed / AI Stylist / Profile) laid out horizontally on the right, using the identical active/inactive token treatment from `DESIGN.md` (lime fill + pink sticker shadow on active, ink fill on inactive) rather than a generic underline — the tab bar's visual language carries over, only its position and orientation change. Trend grid widens to 3-4 columns. Non-grid surfaces (Overlay Preview, Selfie Upload, AI Stylist trigger/polling/result) stay capped at the 480px column specified in `DESIGN.md` Layout & Spacing rather than stretching full-width. |
| `≥ lg`, Overlay Preview specifically | Two-pane layout: canvas on the left, scale/rotate controls + registration CTA stacked on the right, rather than the mobile stacked-vertical arrangement. |

Desktop is an adaptation, not a second product — no feature exists on desktop that doesn't exist on mobile, and the interaction primitives (drag/scale/rotate, file upload, tap-to-navigate) are unchanged across breakpoints.

## Key Flows

### Flow 1 — Trend Discovery (Anonymous) — Priya, browsing during her commute, phone in hand

1. Priya opens the app cold; Feed loads with the marquee ticker already scrolling ("NEW DROPS DAILY ★ Y2K IS BACK ★...").
2. A tilted "HOT" badge on the Chunky Loafer card catches her eye; she taps it.
3. Overlay Preview opens. She's prompted to pick a foot photo — taps the upload control, her phone's photo picker opens (OS-native, no custom camera screen), she picks one from her camera roll.
4. Both images render into `OverlayCanvas.tsx`. She drags the loafer onto her foot, nudges the scale slider until it looks proportional, taps a +15° rotate button to match her foot's angle.
5. **Climax:** the composed image actually looks like she's wearing the shoe — good enough that she pauses her scroll. Below the canvas, the registration CTA appears: this is the exact moment the manual preview has done its job, turning idle curiosity into "I want to see what the *real* AI version looks like."
6. She taps the CTA and lands on Registration/Login, carrying her selected trend forward.

Failure branch: if she backs out without uploading a photo, the canvas stays in its empty dashed-border state (`{components.overlay-canvas}` empty) with no error — there's nothing to fail yet, just an unfinished action.

### Flow 2 — Premium AI-Stylist (Registered) — Jordan, just finished registering, wants to see the real thing

1. Jordan lands on Registration/Login (carried over from a Feed CTA tap), fills in email + password, completes sign-up (architecture AD-7), and is signed in immediately.
2. The app routes Jordan straight into Selfie Upload (no selfie on file yet). He picks a selfie via the file input; it fails server-side validation once — his first photo is a group shot, and he sees the plain-register inline message and re-picks from the same control without navigating away. His second selfie (a solo half-body shot) passes, uploads to Cloudinary, and `user_profiles.selfieUrl` is saved.
3. Jordan lands on AI Stylist with his previously selected trend (the Chunky Loafer, carried from Flow 1) pre-picked. He taps the trigger action — no style picker to fill in, since the app always sends a single fixed style value.
4. `POST /api/vto-tasks` creates the task; Jordan sees the VTO Polling screen — progress bar filling, status copy cycling through "Lacing up your fit…" and "Blending the shadows…"
5. On his first attempt the task resolves `error_no_face` (his selfie's face detection is borderline). The inline error appears in place, plain register: "We couldn't detect a face — try a front-facing selfie with good lighting." He taps "Try another photo," re-opens the upload control right there, and picks a better-lit selfie.
6. He re-triggers. Polling runs again; this time it resolves `success`.
7. **Climax:** VTO Result renders — the actual high-fidelity image of the Chunky Loafer on Jordan's own foot, hype-register header above it ("This is giving main character energy"), price below, Buy Now button beneath that in lime with its pink sticker shadow.
8. Jordan taps Buy Now; it opens the retailer in a new tab. His own app tab stays exactly where it was, VTO result still on screen, in case he wants to look again before checking out.

**Return-visit variant:** a week later, Jordan opens the app again. Registration/Login shows its **Sign in** form instead of Sign up (same screen, toggled) — he enters his existing email + password and lands straight on the Feed, session already carrying his saved selfie. If he wants a different photo on file, Profile → "add/change photo" re-opens the same Selfie Upload control from step 2, no re-registration needed.
