---
baseline_commit: dc42dbaaa699fb1ff3843138e695fad66019546d
---

# Story 1.3: Anonymous Manual Overlay Preview

Status: review

## Story

As an anonymous visitor,
I want to drag, scale, and rotate a selected trend's shoe image onto my own foot photo,
so that I get an instant, no-signup styling preview.

## Acceptance Criteria

1. **Given** a valid trend in the feed, **when** I activate its card, **then** I reach `/preview?trend=<encoded-id>` through a keyboard-accessible link and the selected trend is resolved from the trusted local trend seed; the URL contains only its stable ID, never an image URL or photo bytes.
2. **Given** the Overlay Preview has a valid selected trend, **when** I choose a browser-decodable image with the native file input, **then** my foot photo and the selected shoe render as layered images held only in browser memory; the photo is never uploaded, persisted, placed in a URL, or sent to an API.
3. **Given** both images are visible, **when** I drag the shoe with mouse, touch, or pen, **then** its position updates continuously in real time and remains recoverable within the manipulation stage.
4. **Given** both images are visible, **when** I use the scale slider, a two-pointer pinch, the rotation slider, or the visible ±15° controls, **then** the rendered shoe transform changes accordingly. Scale is clamped to `0.5–2.0` (default `1`, step `0.05`); rotation is clamped to `-45°–45°` (default `0°`, slider step `1°`).
5. **Given** the stage has keyboard focus, **when** I press an arrow key, `+`/`-`, or `[`/`]`, **then** the shoe respectively moves, scales, or rotates without requiring a pointer gesture. Reset restores centered position, scale `1`, and rotation `0°`.
6. **Given** the foot-photo picker is canceled, empty, unsupported, or browser-undecodable, **when** processing completes, **then** canceling preserves the current state without error while invalid files show one concise inline message and cause no upload or network fallback.
7. **Given** a photo is loaded, **when** the first successful drag, scale, pinch, rotation, or keyboard transform occurs, **then** a latched CTA inviting registration to unlock the AI Stylist appears. Merely choosing a photo or pressing Reset at the default pose does not reveal it; replacing the photo resets the pose and CTA state.
8. **Given** any anonymous-preview interaction, **when** the browser handles it, **then** no request is made to YouCam, Cloudinary, MongoDB, an app API route, or any ML/background-removal service. Same-origin delivery of the page and existing static shoe asset is permitted.
9. **Given** a missing, duplicate, malformed, or stale `trend` query value, **when** `/preview` renders, **then** it shows a recoverable choose-a-trend state with a real link back to `/`, not a 500 error or an untrusted image.
10. **Given** a viewport below `lg`, **when** the preview renders, **then** canvas, controls, and CTA stack in one capped column above the fixed mobile navigation. At `lg` and above, one shared stateful overlay instance becomes two panes with the stage on the left and controls/CTA on the right.

## Tasks / Subtasks

- [x] Add stable feed-to-preview navigation (AC: 1, 9)
  - [x] Update `TrendCard` to accept or construct a direct `/preview?trend=<encoded-id>` destination and make the whole card one semantic, keyboard-accessible `next/link`; preserve its current image, label, square card design, and absence of Buy Now UI.
  - [x] Add `getTrendById(id)` to `lib/data/trends.ts`, reusing the existing validated seed and returning `undefined` for missing/malformed IDs without weakening current invalid-entry/duplicate handling.
  - [x] Add `app/preview/page.tsx` as a Server Component. Await the Next.js 16 `searchParams` promise, accept only one string `trend` value, resolve it through `getTrendById`, and pass the trusted `Trend` object into the Client Component.
  - [x] Render a recoverable invalid/missing-selection state with a real Feed link. Do not redirect in a loop, throw, trust arbitrary query data, or create a server/API endpoint.
- [x] Build the local photo lifecycle (AC: 2, 6, 8)
  - [x] Add `app/components/OverlayCanvas.tsx` as the smallest necessary `'use client'` boundary; keep the feed, preview page, trend reader, and navigation server/synchronous where currently applicable.
  - [x] Use a labelled native `<input type="file" accept="image/*">`; do not add `capture`, `MediaDevices`, a custom camera screen, drag-and-drop-only input, or Story 2.2 selfie constraints.
  - [x] Preview the chosen `File` with an object URL. Revoke the previous URL on replacement and the active URL on unmount; clear the input value after processing so the same file can be selected again.
  - [x] Treat picker cancellation as a no-op. Reject zero-byte, non-image, and decode-failed images with one inline plain-register message connected via `aria-describedby`; guard rapid selections so an older decode cannot replace a newer choice.
  - [x] Keep the foot photo in component memory only. Do not use `fetch`, XHR, FormData submission, local/session storage, query strings, server actions, Route Handlers, or external libraries for the photo.
- [x] Implement the manual composition model (AC: 3-5, 7-8)
  - [x] Use declarative layered DOM images with CSS transforms, not an imperative raster canvas: no export/flattening is required, and DOM layers preserve alt text, focus, responsive behavior, and testability.
  - [x] Store translation in normalized stage coordinates so pose survives resize/orientation changes; clamp it so part of the shoe always remains visible. Store scale/rotation with the fixed ranges above.
  - [x] Implement one-pointer dragging with Pointer Events and pointer capture, including `pointerup`, `pointercancel`, and lost-capture cleanup. Apply `touch-action: none` only to the manipulation stage so the surrounding page remains scrollable.
  - [x] Implement two-active-pointer pinch scaling without jumps when moving between one- and two-pointer states. Keep transient pointer geometry in refs and user-visible transform values in state.
  - [x] Add permanently visible labelled scale/rotation range inputs, ±15° rotation buttons, and Reset. Omit decorative corner handles unless they are fully functional; never render a false drag/rotate affordance.
  - [x] Make the stage a labelled focusable group. Arrow keys nudge translation by 2 normalized percentage points, `+`/`-` change scale by `0.05`, and `[`/`]` rotate by `15°`; Shift+Arrow may use a 5-point nudge. Do not intercept these shortcuts while a slider, input, or button owns focus.
  - [x] Latch `hasInteracted` only after a transform actually changes. It remains true after Reset, but a new valid photo resets transform and interaction state.
- [x] Apply the Overlay Preview UX contract (AC: 2, 7, 10)
  - [x] Empty stage: raised ink (`#151515`), square corners, 3px dashed lime border, concise photo-selection prompt. Loaded stage: remove the dashed border, let the foot photo fill the stage, and layer the selected shoe above it.
  - [x] Prefer transparent product imagery. If Story 1.2 retains opaque white product backgrounds after review, use a deterministic CSS blend treatment only when it improves composition; do not add ML/background removal or silently alter source files in this story.
  - [x] Use dark-only Tailwind v4 styling, system typography, hard-edged borders/shadows, sentence-case instructional/error copy, 44x44px controls, and the shared 3px lime `focus-visible` outline with 2px offset.
  - [x] Below `lg`, cap the stage/content around 480px and stack stage → controls → CTA with safe bottom padding. At `lg`, allow a wider two-pane wrapper while keeping each pane/canvas capped around 480px; do not render separate mobile and desktop Client Components.
  - [x] Reuse `AppNavigation` with Feed still current because Preview is a child of the Feed surface; preserve the existing fixed-mobile/sticky-desktop behavior.
  - [x] Show the post-interaction CTA with clear copy such as `Unlock the AI Stylist`. Story 2.1 owns registration navigation and auth; do not add NextAuth, a registration form, a broken link, `#`, or a placeholder route. Render this story's handoff as a clearly unavailable action/callout that Story 2.1 can activate without changing the transform contract.
- [x] Add comprehensive verification (AC: 1-10)
  - [x] Update existing `TrendCard` tests for the accessible preview URL while preserving image/label assertions.
  - [x] Add co-located Jest/RTL tests for empty/loaded states, picker cancel, invalid/decode-failed images, rapid and same-file reselection, object-URL replacement/unmount cleanup, drag/pointer-cancel, pinch, sliders/buttons, keyboard equivalence, clamping, Reset, CTA gating, and photo-replacement reset.
  - [x] Add data/page tests for valid, missing, repeated-array, and stale trend query values. Test that query input never becomes an image source directly.
  - [x] Assert preview interactions never call `fetch`, XHR, or app/external integration modules and never write photo data to storage.
  - [x] Browser-test or manually verify real mouse drag, touch/pinch, file chooser/decode, browser Back, refresh (trend remains; private photo resets), mobile stacked layout, desktop two-pane layout, safe-area padding, focus visibility, and that page scroll is locked only over the stage.
  - [x] Run `npm test -- --runInBand`, `npm run lint`, `npm run build`, and a live `/preview?trend=chunky-platform-loafer` HTTP/render smoke check after Story 1.2 review changes are integrated.

## Dev Notes

### Developer context and scope

- This is FR-02's intentionally low-fidelity, zero-cost anonymous experience. It must create real user value without resembling or calling AI VTO.
- Story 1.2 is currently in review. Before development, integrate its accepted review result and re-read `Trend`, `TrendCard`, `TrendFeed`, `AppNavigation`, and their tests. Do not implement against a stale parallel copy or overwrite review fixes.
- Include feed selection, local photo preview, transforms, accessible alternatives, reset, responsive layout, and the post-interaction CTA surface. Exclude auth, registration forms, selfie validation, uploads, APIs, databases, YouCam, Cloudinary, VTO polling, Buy Now, photo export/download, persistence, analytics, and global state libraries.
- The anonymous input is a foot photo, not Story 2.2's registered selfie. Do not apply head-to-chest/face/dimension requirements. Client checks here only ensure the browser can display the local image.
- `No network` means no upload/API/external-service call caused by preview operations. The initial Next.js document and static `/trends/*` asset naturally load from the app and are not violations.

### Resolved implementation decisions

- **Surface and selection:** dedicated `/preview?trend=<id>` route. The URL ID is authoritative for reload/back/deep-link behavior. Do not copy the foot photo into the URL or storage. `sessionStorage` fallback belongs to the future auth handoff, not the private photo.
- **Rendering:** layered DOM images with CSS transforms. There is no flattened export requirement, so `<canvas>` would add inaccessible imperative state without user value.
- **Transform model:** normalized translation; scale `0.5–2.0`, default `1`, step `0.05`; rotation `-45°–45°`, default `0°`, slider step `1°`; buttons/keyboard rotate `15°`; Reset centers and restores defaults.
- **CTA timing:** first successful transform, not upload. The state latches after it appears, survives Reset, and clears with a replacement photo.
- **CTA handoff:** display and state belong here; functional registration routing belongs to Story 2.1. Do not create a disposable auth placeholder or ship a link to a route that does not exist.
- **Opaque product images:** transparency is preferred. CSS blending may be a local visual fallback; background removal, image mutation, and ML are out of scope.

### Architecture compliance

- Architecture fixes `app/components/OverlayCanvas.tsx` as a Client Component and binds it to AD-1/AD-3. It must never import `lib/services/vtoTask.ts`, `lib/external/*`, MongoDB code, Cloudinary code, YouCam code, or any secret-bearing module.
- Keep the one-way architecture intact. The Server Component resolves trusted seed data through `lib/data/trends.ts`; the Client Component receives serializable `Trend` fields as props and owns only ephemeral interaction state.
- Add no dependency. Use React 19 state/refs/effects, browser Pointer/File/URL APIs, Next.js 16 routing, and Tailwind 4 already installed.
- Strict TypeScript remains mandatory. Use `import type`, `@/*`, default export for route pages, named component exports, and local `useState`/`useRef` only.

### Existing files to update and preserve

- `app/components/TrendCard.tsx`: currently a non-interactive `<article>` by explicit Story 1.2 design. Convert it to exactly one accessible preview link without nested controls; preserve `next/image`, label, card styling, and `buyUrl` omission.
- `app/components/TrendFeed.tsx`: currently maps trusted trends to cards. Prefer leaving it unchanged unless the destination must be passed explicitly.
- `lib/data/trends.ts`: currently validates the complete seed, skips invalid/duplicate entries, logs whole-file failures, and returns `Trend[]`. Add lookup by composing `getTrends()`; do not duplicate parsing or expose `isTrend` unnecessarily.
- `app/page.tsx`: currently composes the server-rendered Feed, navigation, marquee, and trend reader. It should not become a Client Component and likely needs no change.
- `AppNavigation`: currently marks Feed current and leaves future surfaces unavailable. Reuse it on Preview; do not activate AI Stylist/Profile.
- Existing Story 1.2 tests and dark global styles are regression contracts. Update only assertions intentionally changed by selectable cards.

### File/photo lifecycle edge cases

- Picker cancel preserves any existing photo and pose. A new valid photo revokes the previous URL, resets transform/CTA, and becomes authoritative.
- Revoke object URLs only after they are no longer rendered; do not revoke immediately after assigning `src`. Always revoke the active URL on unmount.
- A selection sequence/token prevents slow decode A from overwriting newer selection B. Clear the file input value after reading the selection to permit A → A reselection.
- Unsupported/zero-byte/decode failures stay local and show one sentence below the picker. Do not attempt transcoding, HEIC upload, or remote fallback.
- Refresh intentionally loses the private photo and transform while preserving selected trend via the URL.

### Interaction and accessibility edge cases

- Use pointer capture so drag continues outside the shoe until release/cancel. Release/clear all active pointers on cancellation or lost capture.
- Pinch computes scale from the ratio of current to starting two-pointer distance and clamps it. Transitioning pointer counts must re-baseline to prevent jumps.
- Clamp normalized translation enough that at least part of the shoe stays recoverable. Resize must not require pixel-state migration.
- Do not announce every drag frame. Keep current numeric values exposed through labelled controls and visible output text where useful.
- Apply keyboard transforms only when the focus target is the stage. Arrow keys prevent page scrolling there, not elsewhere.
- Sliders, rotation buttons, Reset, input trigger, and any direct manipulation affordance meet the 44px minimum and focus-ring contract.
- Do not render decorative rounded corner handles unless they perform scale/rotate and are keyboard-accessible; sliders/buttons are the mandatory reliable controls.

### Responsive and visual guardrails

- Mobile: one stateful instance, stage then controls then CTA, max width approximately 480px, fixed-nav/safe-area clearance.
- Desktop: one stateful instance in a two-pane grid; canvas left, controls/CTA right. Treat the 480px rule as a per-pane cap so the wrapper can be wide enough for two panes.
- Empty canvas uses raised ink plus dashed lime. Loaded canvas removes the dashed border. Only genuine manipulation handles may be rounded; other UI stays square.
- Preserve the neon-on-ink palette and reserve hype styling for positive CTA content. Errors/instructions remain calm, sentence case, and inline; never use `alert()` or a modal.

### Testing requirements

- Jest/RTL covers deterministic state and browser-API orchestration. Mock object URLs, image decoding, pointer capture, `fetch`, XHR, and storage explicitly; restore globals after each test.
- jsdom has no real layout, file picker, image decoder, or multi-touch geometry. Use browser-level/manual checks for those behaviors rather than claiming a unit test proves geometry or responsive CSS.
- Every new synchronous component gets a co-located `.test.tsx` render-smoke test. The async preview Server Component receives integration/E2E coverage per project context; extract its invalid-selection UI if focused RTL coverage is needed.
- Preserve all Story 1.2 tests. Run the full suite, lint, build/type checking, and live-route smoke check.

### Previous story and git intelligence

- Story 1.2 introduced the stable `Trend` contract (`id`, `label`, `shoeImageUrl`, nullable `buyUrl`), local validated seed, three compliant local PNG product images, accessible cards, Feed navigation, loading/empty states, and dark responsive styling.
- Story 1.2 validated 8 Jest suites / 13 tests, lint, production build, image dimensions, live HTTP 200, and mobile/desktop screenshots. Continue the same evidence standard.
- Recent history includes commit `4f1d344` for Story 1.2 and `ec81621` for completed Story 1.1. The working tree was clean during story creation; preserve incoming review changes instead of resetting them.

### Latest technical information

- In Next.js 16, page `searchParams` is a Promise. Await it in `app/preview/page.tsx`; repeated query keys arrive as `string[]`, which this story treats as invalid. Using `searchParams` makes the route request-time dynamic intentionally. [Source: https://nextjs.org/docs/app/api-reference/file-conventions/page]
- Use a direct resolved App Router href such as `/preview?trend=${encodeURIComponent(id)}`. `next/link` provides client transitions/prefetching; do not use Pages Router APIs. [Source: https://nextjs.org/docs/app/getting-started/linking-and-navigating]
- Pointer capture keeps pointer events directed at the stage during a drag even when the pointer moves outside its bounds; pair it with stage-scoped `touch-action: none` and release/cancel handling. [Source: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture]
- `URL.createObjectURL(file)` creates the local preview reference. Call `URL.revokeObjectURL()` after replacement/unmount so the browser can release it. [Source: https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static]

### Project Structure Notes

Expected footprint:

```text
app/
  preview/
    page.tsx                              # NEW: server route and trusted trend resolution
    loading.tsx                           # NEW: route-specific preview loading state if useful
  components/
    OverlayCanvas.tsx                     # NEW: sole interactive Client Component
    TrendCard.tsx                         # UPDATE: accessible preview link
    __tests__/
      OverlayCanvas.test.tsx              # NEW
      TrendCard.test.tsx                  # UPDATE
  page.tsx                                # PRESERVE: server-rendered Feed
lib/
  data/
    trends.ts                             # UPDATE: getTrendById helper
    __tests__/trends.test.tsx              # UPDATE
e2e/
  overlay-preview.spec.ts                 # OPTIONAL if browser framework already exists; do not add one solely without approval
```

No changes are expected to `public/trends.json`, product images, `package.json`, lockfile, `next.config.ts`, API routes, `lib/services/*`, or `lib/external/*`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Anonymous Manual Overlay Preview]
- [Source: _bmad-output/planning-artifacts/prds/prd-whattheheel-2026-08-10/prd.md#FR-02 Anonymous Preview]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#AD-3 Registered-only VTO, ownership-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Capability → Architecture Map]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md#Components]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Interaction Primitives]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Accessibility Floor]
- [Source: _bmad-output/implementation-artifacts/1-2-curated-trendsetter-feed-display.md]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5.6)

### Debug Log References

- 2026-08-17: Confirmed feed-to-preview RED tests failed before adding the link, lookup helper, and route.
- 2026-08-17: Strict TypeScript required explicit `undefined` initializers for React 19 refs.
- 2026-08-17: A transient full-suite failure came from concurrent Story 2.1 test creation; reran after its matching module landed and all suites passed.

### Implementation Plan

- Resolve only stable trend IDs on the server and pass the trusted seed record into one interactive client boundary.
- Keep private photos in object URLs with decode sequencing and deterministic revocation.
- Model transforms as clamped normalized state, with Pointer Events, sliders/buttons, and equivalent stage keyboard controls.
- Verify state orchestration in Jest/RTL and responsive presentation in the installed headless browser without adding dependencies.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added an encoded, accessible feed-card link and a request-time preview route with recoverable invalid-selection handling.
- Added a browser-memory-only photo lifecycle with cancellation, validation, decode-race protection, same-file reselection, and object URL cleanup.
- Added clamped drag, pinch, slider, button, keyboard, Reset, and latched CTA behavior in a single responsive client component.
- Verified 14 Jest suites / 51 tests, ESLint, strict production build, live HTTP 200 rendering, and mobile/desktop browser layouts.

### File List

- `_bmad-output/implementation-artifacts/1-3-anonymous-manual-overlay-preview.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/components/AppNavigation.tsx`
- `app/components/OverlayCanvas.tsx`
- `app/components/TrendCard.tsx`
- `app/components/__tests__/OverlayCanvas.test.tsx`
- `app/components/__tests__/TrendCard.test.tsx`
- `app/preview/page.tsx`
- `app/preview/__tests__/page.test.tsx`
- `lib/data/trends.ts`
- `lib/data/__tests__/trends.test.tsx`

## Change Log

- 2026-08-17: Created comprehensive implementation context and advanced the story to ready-for-dev.
- 2026-08-17: Implemented anonymous manual overlay preview and advanced the story to review.
