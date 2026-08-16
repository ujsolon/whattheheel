# UX Spine vs Epics/Stories Reconciliation

Scope: story-vs-spine coverage only (DESIGN.md + EXPERIENCE.md against epics.md Stories 1.1–2.5). No PRD/architecture-fidelity or visual-quality checks performed — those are covered elsewhere.

## Verdict

Coverage is strong for the UI-heavy stories (1.2, 1.3, 2.2, 2.4, 2.5) with real behavioral specificity, and the style-picker removal is applied consistently everywhere — but one finding is a genuine AC contradiction (Story 2.1's registration mechanism) and one is a real component-token gap (VTO polling), both worth fixing before build.

## Findings

### 1. [High] EXPERIENCE.md contradicts Story 2.1's registration-mechanism AC

Story 2.1 (epics.md) requires:
- "a `users` document is created by the NextAuth MongoDB adapter (adapter-owned, no other code writes to it)"
- "`@next-auth/mongodb-adapter` is installed with `--legacy-peer-deps`, configured against the correct dev/prod MongoDB Atlas database names"

EXPERIENCE.md instead designs a custom endpoint that bypasses the adapter, and says so explicitly in three places:
- Information Architecture table: "Email + password sign-up/sign-in via NextAuth `CredentialsProvider` (FR-03, architecture AD-7) — no OAuth button, **no adapter**"
- Component Patterns, "Registration / Login form" row: "submit creates the account via `POST /api/auth/register` (bcryptjs-hashed server-side) then signs in immediately"
- Key Flow 2, step 1: "`POST /api/auth/register` hashes his password (bcryptjs) and creates the `users` document — **no adapter**, no OAuth (architecture AD-7)"

A developer building strictly from the spine would create the `users` document via a hand-rolled route + bcryptjs, not via `@next-auth/mongodb-adapter` — directly violating Story 2.1's "adapter-owned, no other code writes to it" AC. This needs reconciliation (either the spine's "no adapter" language is wrong, or Story 2.1's AC is stale) before a developer can implement it correctly from the spine alone.

### 2. [Medium] DESIGN.md has no component token for the VTO polling/progress-bar UI

EXPERIENCE.md's Component Patterns table names a row "VTO polling / loading state" and specifies real visual detail for it: "a full-width indeterminate progress bar (lime fill on `{colors.ink-raised}` track)" plus rotating status copy. DESIGN.md's Components section (and its frontmatter `components:` token block) has no corresponding entry — no `progress-bar` (or similarly named) token exists anywhere in DESIGN.md. The polling row is the only Component Patterns entry that references raw color tokens (`{colors.lime}` / `{colors.ink-raised}`) directly instead of a `{components.*}` token, so it fails the "every Component Patterns row has a matching DESIGN.md token" check. Needed for Story 2.3's polling AC to be visually unambiguous to a developer.

### 3. [Low] Stale cross-reference note about Story 2.3's AC

EXPERIENCE.md's Information Architecture section (line 44) still reads: "Story 2.3's acceptance criteria currently reads 'I select a trend and style and trigger VTO' ... `epics.md` Story 2.3 likely needs that AC line edited to drop 'and style' — flagged here per instruction, not changed by this pass."

epics.md Story 2.3's AC has already been edited and now reads "When I select a trend and trigger VTO" (no "and style"). The underlying design is correctly consistent with the edited AC (no style-picker UI anywhere — confirmed via full-text search of DESIGN.md/EXPERIENCE.md, and explicitly banned in EXPERIENCE.md's Interaction Primitives "Banned" list), but the note itself is now inaccurate/stale documentation and should be updated or removed to avoid confusing a future reader into thinking the AC still needs changing.

### 4. [Low] No dedicated DESIGN.md entry for "Registration / Login form" as a named component

EXPERIENCE.md's Component Patterns table names "Registration / Login form" as a row, but DESIGN.md's Components section has no matching top-level entry — only its constituent parts (`{components.input-field}`, `{components.focus-ring}`) are tokenized. This is minor since the form is a straightforward composition of already-specified pieces (unlike finding #2, there's no missing *visual* information — inputs, labels, and inline-error styling are all covered), but it means the EXPERIENCE.md row name doesn't map 1:1 onto a DESIGN.md components entry the way every other row does.

## Coverage confirmed sufficient (no findings)

- **Story 1.1** (scaffolding) — not UI-relevant; correctly has no spine coverage, none expected.
- **Story 1.2** (Trendsetter Feed) — trend-card component (DESIGN.md) + "Trend feed card" row (EXPERIENCE.md) cover image/label/badge display; State Patterns cover empty/loading; Responsive & Platform covers the responsive grid AC.
- **Story 1.3** (Manual Overlay Preview) — `OverlayCanvas.tsx` row specifies drag (real-time pointer reposition), scale (slider + pinch), rotate (slider −45°…45° + ±15° buttons), client-only/no-network (AD-3), and the post-interaction registration CTA (State Patterns "Success (overlay composed)") — matches Story 1.3's AC wording closely, including the "no network request" and CTA-after-interaction clauses.
- **Story 2.2** (Selfie Capture) — Upload control row covers server-side-first validation (AD-5), inline plain-register error before Cloudinary upload, and re-pick without navigating away; State Patterns cover both the error and success ("Selfie saved.") states.
- **Story 2.3** (VTO Generation, minus the adapter issue in #1/#3) — trend-only trigger (no style UI, consistent with the dropped AC), polling behavior (2s interval, terminal-status resolution), and success→result display are all covered.
- **Story 2.4** (VTO Failure Handling) — Voice and Tone's locked-copy table reproduces all six error codes verbatim (matching Story 2.4's `error_no_face` AC exactly) plus the `invalid_parameter`→generic-copy rule; Component Patterns' "Inline error component" row covers same-screen/non-modal rendering and the "Try another photo" re-open action.
- **Story 2.5** (Buy Now Links) — "Buy Now link" row and DESIGN.md's `buy-now-button`/inline-error entries both state the hidden-when-absent rule near-verbatim to the AC, plus new-tab/`rel="noopener"` behavior.

## Style-picker check

No style-selector UI is implied anywhere in DESIGN.md or EXPERIENCE.md. Full-text search for "style" in both files turns up only "AI Stylist" (a page/section name), "Brand & Style" (a heading), and explicit statements that a style picker does **not** exist: EXPERIENCE.md's Information Architecture note, Interaction Primitives' "Banned" list ("a style picker (single fixed default style, no user-facing selection)"), and Key Flow 2 step 3 ("no style picker to fill in, since the app always sends a single fixed style value"). Consistent with the recent epics.md edit dropping "and style" from Story 2.3.
