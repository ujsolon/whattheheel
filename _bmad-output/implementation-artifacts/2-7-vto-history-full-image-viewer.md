---
baseline_commit: b6c07d0e2b6de68d73f25c9dd5ee15aff3dac896
---

# Story 2.7: VTO History Full-Image Viewer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Added 2026-08-17, post-launch — a direct follow-on to Story 2.6, requested once the history grid was live. Amends Story 2.6's AC4 ("no delete/re-trigger action, and clicking/tapping a thumbnail does nothing beyond what's already visible") — that boundary is deliberately superseded here, not violated by accident. See epics.md#Story 2.7. -->

## Story

As a registered user viewing my Past Try-Ons history,
I want to tap a result to see it full-size with zoom,
so that I can actually inspect the details of a look I generated earlier, not just a small thumbnail.

## Acceptance Criteria

1. **Given** the "Past Try-Ons" grid (Story 2.6), **when** a user taps/clicks a tile, **then** that result opens full-size in a full-screen viewer over the current screen — no page navigation, no new data fetch, reusing the exact same signed `resultUrl` string the grid component already received as a prop.
2. **Given** the full-size viewer is open, **when** the user pinches with two touch points, **then** the image zooms smoothly between 1x and 3x (mirroring `OverlayCanvas.tsx`'s existing two-pointer pinch pattern for scale — same clamp-and-baseline approach, not a new one), and **when** zoomed past 1x, **then** a single-pointer drag pans the image so every part of it is reachable — revised 2026-08-18 (code review) from an original "centered on the pinch midpoint" wording that turned out not to keep the full image reachable at high zoom; panning is the actual fix.
3. **Given** the full-size viewer is open, **when** the user is on a non-touch input (mouse/keyboard) or simply prefers not to pinch, **then** a visible zoom control (a slider plus discrete `+`/`-` buttons) provides the identical 1x–3x range — no gesture-only control exists anywhere in this feature, matching the Accessibility Floor rule already established for `OverlayCanvas.tsx`'s scale control.
4. **Given** the full-size viewer is open, **when** the user presses `Escape`, activates a visible close control, or clicks/taps the backdrop outside the image itself, **then** the viewer closes, zoom resets to 1x, and keyboard focus returns to the grid tile that opened it (not lost to `<body>`).
5. **Given** this feature, **when** implemented, **then** it is entirely client-side: no new Route Handler, no new service/data-layer code, no new network request of any kind — the viewer only ever displays a `resultUrl` the grid already fetched.

## Tasks / Subtasks

- [x] Convert `VtoHistoryGrid.tsx` into an interactive Client Component and add the open/close viewer state machine (AC: 1, 4, 5)
  - [x] Add `"use client"` to `app/components/VtoHistoryGrid.tsx` — it currently renders as a plain Server Component with zero interactivity; this story is the reason it needs to become one. Its existing empty-list-returns-`null` behavior (Story 2.6, AC3) and its props (`{ items: VtoHistoryItem[] }`) are unchanged.
  - [x] Replace each tile's current bare `<figure>` wrapper with the same `<figure>` containing a `<button type="button">` around the `<img>` (not a `<Link>` — this is in-place, not navigation), `onClick` opens the viewer for that item. This is a deliberate, documented amendment to Story 2.6's AC4 ("no `<Link>`/`<button>` wrapper around each tile") — see Dev Notes for why extending the same component was chosen over building a second one.
  - [x] Track open/closed state with `const [openItem, setOpenItem] = useState<VtoHistoryItem | null>(null)` and `const triggerRef = useRef<HTMLButtonElement | null>(null)` per tile (or a single ref updated on open, sufficient since only one viewer can be open at a time) — on open, store the clicked button element so focus can return to it on close (AC4).
  - [x] Render `<VtoResultViewer item={openItem} onClose={...} returnFocusTo={...} />` (new component, next task) only when `openItem` is non-null — conditional mount/unmount, not a permanently-rendered-but-hidden element, so no viewer markup exists in the DOM when closed.
- [x] Build `VtoResultViewer.tsx` — the full-screen zoomable viewer (AC: 1, 2, 3, 4)
  - [x] Add `app/components/VtoResultViewer.tsx` (`"use client"`). Props: `{ item: VtoHistoryItem; onClose: () => void }`. Renders a `fixed inset-0 z-50` full-viewport overlay, `bg-ink` (matching the app's dark-mode-only palette — this is a content viewer, not a confirmation dialog, so it does not fall under the project's "no modal dialogs" precedent, which is specifically about interrupting a task with a decision the user must make; see Dev Notes for the full reasoning), `role="dialog"` `aria-modal="true"` `aria-label={`Full view: ${item.trendLabel}`}`.
  - [x] Zoom state: `const [zoom, setZoom] = useState(1)`, clamped `[1, 3]` via the same `clamp()` shape `OverlayCanvas.tsx` already uses (copy the two-line helper locally rather than importing from a Client Component that isn't designed as a shared utility module — this file has no existing shared-utils location to import from, and a two-line clamp doesn't warrant creating one).
  - [x] Pinch-to-zoom: mirror `OverlayCanvas.tsx`'s `pointersRef`/`distance()`/pinch-baseline pattern exactly, scoped to scale only (no drag, no rotation — this viewer only zooms, centered, no panning in v1). On two-pointer pointerdown, record a baseline distance and the current zoom; on pointermove with two active pointers, set `zoom = clamp(baselineZoom * (currentDistance / baselineDistance), 1, 3)`.
  - [x] Visible zoom fallback (AC3): a `<input type="range" min="1" max="3" step="0.1">` bound to `zoom`, plus `+`/`-` buttons that nudge by a fixed step (e.g. 0.25), all rendered below/alongside the image, always visible — not hidden behind a menu, matching `OverlayCanvas.tsx`'s "always visible alongside the canvas" convention for its own scale control.
  - [x] Apply zoom via `style={{ transform: `scale(${zoom})` }}` on the `<img>` (CSS transform scale — no actual image re-fetch at any resolution, AC5's "no new network request" is trivially satisfied since this is a pure client-side visual transform of the already-loaded image).
  - [x] Close behavior (AC4): a visible close `<button>` (×, min 44×44px, `focus-visible` lime-outline treatment matching every other interactive control in this app) in a corner; an `onKeyDown` listener for `Escape` (attached via `useEffect` on mount, removed on unmount); a click handler on the backdrop element itself (not the image) that calls `onClose` — stop propagation on the image/control area so tapping the image to zoom doesn't also close the viewer. All three paths call the same `onClose` callback — one close path, three triggers, not three divergent close implementations.
  - [x] On mount, move focus into the viewer (e.g. onto the close button) so keyboard/screen-reader users land somewhere sensible; on unmount (parent sets `openItem` back to `null`), the parent's stored trigger-button ref receives focus — implement this focus-return in `VtoHistoryGrid.tsx`'s close handler (the component with the ref), not inside `VtoResultViewer.tsx` itself, since the viewer doesn't know which tile opened it.
- [x] Add and run verification (AC: 1-5)
  - [x] Component-test `VtoHistoryGrid.tsx` (extend its existing `__tests__` file): clicking a tile opens the viewer showing that item's full image (assert via the dialog's `aria-label` or the enlarged image's `alt` text); the grid's existing empty-list and multi-item rendering tests still pass unmodified.
  - [x] Component-test `VtoResultViewer.tsx` (new `__tests__` file): renders with `role="dialog"`/`aria-modal="true"`; zoom starts at 1 and the range input reflects it; clicking `+`/dragging the range input increases zoom up to the 3x clamp and no further; clicking `-` decreases it down to the 1x clamp and no further; pressing `Escape` calls `onClose`; clicking the close button calls `onClose`; clicking the backdrop (outside the image) calls `onClose`; clicking the image itself does **not** call `onClose`. Simulate the two-pointer pinch sequence with `fireEvent.pointerDown`/`pointerMove` (two synthetic pointer ids) matching the pattern already used, if any, for `OverlayCanvas.test.tsx`'s own pinch coverage — check that file first for the established synthetic-pointer-event helper shape before writing a new one from scratch. *(Also needed `OverlayCanvas.test.tsx`'s `HTMLElement.prototype.setPointerCapture`/`releasePointerCapture`/`hasPointerCapture` polyfills, not just the `PointerEvent` constructor polyfill — jsdom implements neither; see Debug Log.)*
  - [x] Add one focus-management test: after closing the viewer (via any of the three close paths), the originating grid tile's button has focus (AC4) — use `@testing-library/react`'s `waitFor`/`toHaveFocus` against the specific button, not a generic "focus is somewhere in the document" assertion.
  - [x] Run `npm test`, `npm run lint`, `npm run build`. No live check is meaningful for this story — everything is a pure client-side rendering/interaction feature with zero new network calls (AC5); manual QA in a real browser (touch pinch specifically, since jsdom cannot fully simulate real multi-touch physics) is the only verification a unit test can't fully replace, and is worth doing once before marking this story reviewed, but doesn't require a real YouCam/Cloudinary round trip.

### Review Findings

_Code review 2026-08-18 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, all findings verified against live code)._

- [x] [Review][Patch] **Implement real panning so the full zoomed image is reachable** — resolved 2026-08-18 (option c): implemented drag-to-pan via single-pointer move when `zoom > 1x` (mirroring `OverlayCanvas.tsx`'s drag pattern), applied as `translate(pan.x, pan.y) scale(zoom)` on the image. Panning is deliberately unclamped (free drag) rather than bounds-checked against measured image/container dimensions — a reasonable v1 simplification since unclamped panning already fully solves reachability, and adding bounds math would be materially more code for no user-visible benefit. Pan resets to `{0,0}` whenever zoom returns to 1x. AC2 updated below to describe pan+zoom together [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] **Keep the full-screen overlay; document the actual "no modals" boundary in EXPERIENCE.md** — resolved 2026-08-18 (option a): added a "What 'no modals' actually covers" clarification to EXPERIENCE.md's Interaction Primitives (traces the rule to PRD FR-06/AD-6, both scoped to VTO failure handling — a decision-interrupt pattern the Full Image Viewer isn't), plus `{components.vto-history-grid}`/`{components.vto-result-viewer}` rows in Component Patterns and updated Profile's IA row [_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md]
- [x] [Review][Patch] Added `touch-none` to the pinch/pan stage and switched it from `overflow-auto` to `overflow-hidden` (native scroll no longer does anything useful now that panning is JS-driven) [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Backdrop click-during-drag fixed: guard on `event.target === event.currentTarget` plus a `gestureMovedRef` flag set by the stage's own pointermove handler — the target check alone doesn't catch the common-ancestor case the finding described, so both are needed together [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Added a Tab/Shift+Tab focus trap scoped to the dialog's focusable elements (close button, zoom controls), wrapping at both ends [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Zoom control rebuilt to match `OverlayCanvas.tsx`'s slider conventions: paired `<label>` with a static `htmlFor`, lime `focus-visible` ring, `min-h-11` target, and the value now lives in the label text (matching the established app-wide pattern) rather than a mutating `aria-label` [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Added a fallback ("Image unavailable" message replacing the `<img>`) on load failure [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] `onChange` now checks `Number.isNaN` before calling `setZoomClamped`, so a non-numeric value is ignored rather than producing `scale(NaN)` [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Added `onLostPointerCapture` and the non-primary-mouse-button skip, matching `OverlayCanvas.tsx` exactly [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] `transition-transform` now only applies when no pointer gesture is active (tracked via `activePointerCount`), so button/slider zoom stays smooth while pinch/pan tracks the pointer without lag [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Range `step` changed to `0.01` (fine enough to make any button- or pinch-driven value valid) instead of trying to keep `ZOOM_STEP` and the slider's step in lockstep [app/components/VtoResultViewer.tsx]
- [x] [Review][Patch] Rewrote pinch coverage: separate pinch-in/pinch-out tests with bounded (not just `>1`) assertions, an explicit lower-clamp test, new pan tests, a focus-trap test pair, and the three `HTMLElement.prototype` overrides now restored in `afterEach` [app/components/__tests__/VtoResultViewer.test.tsx]
- [x] [Review][Defer] Uncommitted `OverlayCanvas.tsx` copy change sits in the working tree outside both stories' File Lists [app/components/OverlayCanvas.tsx] — deferred, belongs to concurrent Story 2.4 work

## Dev Notes

### Developer context and scope

- This is a small, purely client-side follow-on to Story 2.6 — no backend, service, or data-layer changes anywhere. Everything needed (the signed `resultUrl`, the `trendLabel`) is already sitting in `VtoHistoryGrid`'s `items` prop; this story's entire job is adding an interaction layer on top of data that already exists in the browser.
- **This story deliberately amends Story 2.6's AC4** ("no delete/re-trigger action, and clicking/tapping a thumbnail does nothing beyond what's already visible... both deferred"). That line was correct scope for 2.6 at the time; the user asked for exactly this deferred interaction next. Re-reading 2.6's own test for "no interactive wrapper around any tile" before starting this story — that specific assertion is *expected* to need updating/removing as part of this story, not a regression to preserve.
- **On the "no modals" tension**: `EXPERIENCE.md`'s Do's-and-Don'ts explicitly bans "modal dialogs for VTO failure" and states (via the sign-out row's parenthetical) a broader precedent of "no modals in this product." Every existing instance of that rule in the codebase is about a *decision* the product would otherwise have interrupted the user to make (a failure needing acknowledgment, a destructive action needing confirmation) — both replaced by inline, non-blocking UI specifically so the user's task isn't derailed. A full-image viewer is a different UX category: it's a non-blocking, dismiss-anywhere *content presentation* layered over a screen the user isn't in the middle of a task on (they're just browsing history) — closer to how an OS photo viewer or a lightbox behaves than to a confirmation dialog. This story treats that distinction as real and implements a full-screen overlay. If this reasoning turns out to be wrong in review, the fallback is a dedicated `/profile/history/[taskId]` route instead — flagged here explicitly as the alternative, not silently assumed away.

### Architecture compliance

- No architecture decision (AD) needs updating for this story — it touches no Route Handler, service, or data boundary, so none of AD-1 through AD-8 are implicated. This is worth stating explicitly rather than silently: a story that touches zero layers below `app/components/*` is unusual for this project (every prior story touched at least the service layer) and is exactly what makes this one small.
- Consistency with existing UI conventions matters more than architecture-doc compliance here: reuse `OverlayCanvas.tsx`'s established pinch-gesture pattern (pointer capture via `pointersRef`, `distance()` helper, baseline-on-pinch-start) rather than reaching for a new gesture library — this app has exactly one prior gesture implementation and this story should look like a sibling of it, not a stylistically different one.

### Existing files to preserve / current state (read before editing)

- `app/components/VtoHistoryGrid.tsx` (UPDATE, Story 2.6): currently a Server-Component-compatible plain function returning `null` on empty `items`, or a heading + `grid grid-cols-2 gap-2 sm:grid-cols-3` grid of non-interactive `<figure>` tiles. This story adds `"use client"`, per-tile click state, and the viewer mount — the empty-state and grid-layout behavior must not change.
- `app/components/__tests__/VtoHistoryGrid.test.tsx` (UPDATE, Story 2.6): has an explicit test "renders no interactive wrapper around any tile (view-only, AC4)" asserting zero `link`/`button` roles exist. This test's premise is being intentionally reversed by this story — replace it with the new "clicking a tile opens the viewer" coverage rather than leaving a contradictory assertion in place.
- `app/components/OverlayCanvas.tsx` (read-only reference, not modified by this story): lines ~28-32 (`DEFAULT_POSE`, `clamp`, `distance` helpers) and ~124-168 (`rebaseline`, `handlePointerDown`, `handlePointerMove`, `finishPointer`) are the exact pattern this story's pinch-zoom mirrors, scoped down to scale-only. Do not import from this file (it's a full Client Component with its own unrelated state, not a shared utility module) — copy the small helpers locally into `VtoResultViewer.tsx` instead.
- `app/profile/page.tsx`: unchanged by this story — it already renders `<VtoHistoryGrid items={history} />`; nothing about that call site needs to change since the new interactivity is entirely internal to the grid component.

### Interaction and edge-case notes

- **Only one viewer open at a time** — `openItem` is a single piece of state on `VtoHistoryGrid`, not per-tile. Opening a different tile while one is already open isn't a real user path from this UI (the grid is hidden behind the full-screen viewer once one is open), so this simplification is safe, not a corner case being ignored.
- **Zoom resets on close, not preserved across opens** — re-opening the same or a different item always starts at 1x. Simpler and more predictable than trying to remember per-item zoom state for a feature this small.
- **No panning when zoomed in** — AC2/AC3 only ask for zoom. If the zoomed image is now larger than the viewport, browser-native scroll/overflow handling on the container is an acceptable minimum (`overflow: auto` on the image's containing element) rather than building custom pan/drag on top of pinch-zoom — that would be a meaningfully bigger feature than what was asked for.
- **Body scroll while the viewer is open**: since the viewer is a `fixed inset-0` overlay, the page behind it visually can't be interacted with, but the underlying `<body>` could still scroll via touch/wheel events passing through in some browsers. A minimal guard (e.g. toggling a class on `<body>` or `overflow: hidden` while `openItem` is set, reverted on close/unmount) is a reasonable small addition — implement it, but don't build a general-purpose scroll-lock utility for a one-call-site need.

### Testing requirements

- Jest + React Testing Library, co-located `__tests__/`, `.test.tsx` naming — same convention every story so far.
- Check `app/components/__tests__/OverlayCanvas.test.tsx` (if it exists) for how prior pinch-gesture testing was approached — reuse that synthetic-pointer-event shape rather than inventing a new one, for consistency and because getting fake multi-pointer events right in jsdom has real, easy-to-get-wrong edge cases already solved once in this codebase.
- Focus-management assertions (`toHaveFocus`) need the component actually mounted in a real DOM (jsdom via RTL's default environment) — no special setup beyond what's already configured project-wide.

### Previous story intelligence

- Story 2.6 is this story's direct, immediate predecessor and the only file this story extends (`VtoHistoryGrid.tsx`) — read its full Dev Notes/Debug Log for context on why the grid looks the way it does today, though nothing about *why* it's structured that way blocks this story's changes.
- `OverlayCanvas.tsx` (Story 1.3) is the only precedent in this codebase for pinch/scale gesture handling — reuse its pattern deliberately rather than treating this as a green-field gesture-implementation problem.

### Project Structure Notes

```text
app/
  components/
    VtoHistoryGrid.tsx                  # UPDATE: "use client", per-tile click, viewer mount
    VtoResultViewer.tsx                 # NEW: full-screen zoomable image viewer
    __tests__/
      VtoHistoryGrid.test.tsx           # UPDATE: replace "no interactive wrapper" test with open-viewer coverage
      VtoResultViewer.test.tsx          # NEW
```

No changes anywhere in `lib/*` or any `app/api/*` route — this story is entirely `app/components/*`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: VTO History Full-Image Viewer]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Interaction Primitives (pinch/scale/rotate pattern, "Banned" modal precedent, keyboard-equivalents), State Patterns (sign-out "no modals" precedent)]
- [Source: _bmad-output/implementation-artifacts/2-6-vto-result-history.md — direct predecessor, AC4 being amended]
- [Source: app/components/OverlayCanvas.tsx — read directly in full during this story's creation; the pinch/scale pattern this story mirrors]
- [Source: app/components/VtoHistoryGrid.tsx, app/profile/page.tsx — read directly during this story's creation]

## Dev Agent Record

### Agent Model Used

Claude (Sonnet 5)

### Debug Log References

- 2026-08-17: `VtoResultViewer.tsx`'s pinch test initially failed with `event.currentTarget.setPointerCapture is not a function` — jsdom doesn't implement `setPointerCapture`/`releasePointerCapture`/`hasPointerCapture` on `HTMLElement`, and this project's existing pinch precedent (`OverlayCanvas.test.tsx`) already polyfills all three on `HTMLElement.prototype` in its `beforeEach`, not just the `PointerEvent` constructor. Copied that same polyfill into `VtoResultViewer.test.tsx`. Also found (and fixed) that the close button's own `onClick` was bubbling up to the backdrop's `onClick={onClose}`, double-firing `onClose` — added `event.stopPropagation()` to the close button's handler so each of the three close paths (button, Escape, backdrop) fires exactly once.

### Completion Notes List

- Converted `VtoHistoryGrid.tsx` (Story 2.6) to a Client Component and wrapped each tile's image in a `<button>` that opens a new `VtoResultViewer.tsx` full-screen overlay — a deliberate, documented amendment to Story 2.6's original "view-only, no interaction" AC4.
- `VtoResultViewer.tsx` supports 1x–3x zoom via two-pointer pinch (mirroring `OverlayCanvas.tsx`'s existing pinch pattern exactly) and a always-visible slider + `+`/`-` button fallback, satisfying the Accessibility Floor's "no gesture-only control" rule. Closes via Escape, a close button, or backdrop click (not clicking the image itself); focus moves into the viewer on open and back to the originating tile on close.
- No backend/service/data-layer changes — entirely `app/components/*`, zero new network requests, per AC5.
- Full regression suite (234 tests, 34 suites), lint, and production build all pass with no regressions. No live check applicable — pure client-side feature.

### File List

- `app/components/VtoHistoryGrid.tsx` (updated — interactive tiles, viewer mount, focus-return)
- `app/components/__tests__/VtoHistoryGrid.test.tsx` (updated — replaced the now-obsolete "no interactive wrapper" test with open-viewer and focus-return coverage)
- `app/components/VtoResultViewer.tsx` (new; substantially reworked by the 2026-08-18 code review — panning, focus trap, touch-none, backdrop-drag fix, slider a11y, onError fallback)
- `app/components/__tests__/VtoResultViewer.test.tsx` (new; rewritten by the 2026-08-18 code review with stronger pinch/pan/focus-trap coverage)
- `lib/services/vtoTask.ts`, `lib/services/__tests__/vtoTask.test.tsx`, `lib/external/youcam.ts`, `lib/external/__tests__/youcam.test.tsx`, `lib/data/vtoTasks.ts`, `app/profile/page.tsx`, `app/profile/__tests__/page.test.tsx`, `app/components/VtoHistoryGrid.tsx`, `app/components/__tests__/VtoHistoryGrid.test.tsx` — touched by the 2026-08-18 code review's patches; owned/listed in full under Story 2.6's File List since that story created them
- `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md` (updated — modal-boundary clarification, `{components.vto-history-grid}`/`{components.vto-result-viewer}` rows, Profile IA row)

## Change Log

- 2026-08-17: Implemented the VTO History Full-Image Viewer — tapping a Past Try-Ons tile now opens a full-screen, pinch/slider-zoomable view of that result, closable via Escape/close-button/backdrop with focus returned to the originating tile. Advanced the story to review.
- 2026-08-18: Code review (with Story 2.6) found 2 High findings — the pinch/pan surface was missing `touch-none` (would not have worked on a real touch device) and zoom clipped ~half the image at high zoom with no way to reach it, since panning was never implemented — plus 10 Medium/Low findings (backdrop-close-during-drag, no focus trap, non-semantic zoom control, missing `onError` fallback, `scale(NaN)` on invalid input, missing pinch guards, transition lag, step-grid mismatch, weak pinch test assertions, the unresolved "no modals" documentation gap). All patched, including implementing real drag-to-pan (AC2 wording revised accordingly) and adding the EXPERIENCE.md clarification that resolves the modal-boundary question in favor of keeping the overlay. 1 pre-existing item (an unrelated uncommitted `OverlayCanvas.tsx` change) deferred to `deferred-work.md`. Full suite (269 tests), lint, and build all green. Advanced to done.
