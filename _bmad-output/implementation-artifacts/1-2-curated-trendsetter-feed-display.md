---
baseline_commit: ec816216d63ebaaa2cdde47c2efd10c2619f7331
---

# Story 1.2: Curated Trendsetter Feed Display

Status: review

## Story

As an anonymous visitor,
I want to browse a curated gallery of trending shoes,
so that I can discover styles before committing to registration.

## Acceptance Criteria

1. **Given** the app is running, **when** I visit the default trend-feed page at `/`, **then** I see a data-driven gallery sourced from `public/trends.json`, never from MongoDB or an API route.
2. **Given** a valid trend entry, **when** it is rendered, **then** the card displays its shoe image and label. Every entry has the strictly typed fields `id`, `label`, `shoeImageUrl`, and `buyUrl`; `buyUrl` is present but may be `null` and is not rendered or linked until Story 2.5.
3. **Given** the curated dataset, **when** product images are added, **then** each image is curator-verified as jpg/jpeg/png/heic, under 10 MB, at least 512x512, and framed with the shoe occupying more than 25% of image height. This story does not implement runtime image validation.
4. **Given** a viewport below `lg` (1024px), **when** the feed renders, **then** it uses the mobile layout with a two-column trend grid and bottom navigation; at `lg` and above, navigation moves to the top and the grid widens to three or four columns without horizontal overflow.
5. **Given** the dataset is empty or cannot be read/parsed, **when** the feed renders, **then** the user sees `No trends right now — check back soon.` and the server logs the underlying read/parse error when one exists.
6. **Given** any rendered shoe image or navigation control, **when** it is consumed with assistive technology or keyboard navigation, **then** shoe images have descriptive alt text, navigation uses semantic `<nav>`, interactive controls have visible lime focus treatment and at least 44x44px targets, and reading/tab order follows visual order.

## Tasks / Subtasks

- [x] Create the static trend data boundary and curated seed (AC: 1-3, 5)
  - [x] Add `public/trends.json` with a small, representative set of unique trend entries using the required `id`, `label`, `shoeImageUrl`, and nullable `buyUrl` fields.
  - [x] Store curator-approved product images under `public/trends/`; use stable root-relative URLs such as `/trends/example.jpg`. Record source/license and manual spec verification in a nearby curation note or JSON-adjacent documentation.
  - [x] Add `lib/data/trends.ts` as the only reader and type owner for the seed. Read the local file server-side (do not fetch the app's own public URL), validate the top-level/field shape and unique IDs, skip invalid individual entries, and return a safe empty collection after logging whole-file read/parse failures.
- [x] Replace the foundation landing page with the feed (AC: 1-2, 4-6)
  - [x] Keep `app/page.tsx` a Server Component and render data returned by `lib/data/trends.ts`; do not add `'use client'`, browser fetching, an API route, or React state.
  - [x] Add a reusable named-export `TrendCard` in `app/components/TrendCard.tsx`; keep it non-interactive until Story 1.3 supplies a real destination. Render the image through `next/image` with explicit aspect-ratio sizing and responsive `sizes`, descriptive fallback `alt` text, and the visible label without allowing long text to break the grid. Do not add a Client Component solely for image-error state.
  - [x] Add the feed heading/copy and marquee treatment from the approved UX contract. Implement motion in CSS and hold it static under `prefers-reduced-motion`.
  - [x] Add the responsive Feed / AI Stylist / Profile navigation shell. Mark Feed current; do not create broken destination links or placeholder feature pages for the two future surfaces.
  - [x] Add a route loading UI with trend-card skeletons and the required empty-state treatment. Mark visual skeletons `aria-hidden` and expose an accessible loading status without duplicate announcements.
- [x] Apply the approved visual system (AC: 4, 6)
  - [x] Extend `app/globals.css` only where shared tokens/keyframes are useful; implement the remaining presentation with Tailwind CSS v4 utilities.
  - [x] Preserve the dark-only canvas. Use square paper cards, 3px ink borders, hard 4px offset shadows, system typography, tight card gutters, and the approved neon-on-ink contrast rules; do not add a UI/component library, rounded cards, blurred shadows, or a light-mode path.
- [x] Add and run verification (AC: 1-6)
  - [x] Co-locate `*.test.tsx` render/accessibility-smoke tests for every new synchronous component and loading UI; update the existing page test to cover the new page contract rather than the old placeholder heading.
  - [x] Test the data reader for valid, empty, malformed, and missing JSON behavior without calling MongoDB or the network.
  - [x] Verify the rendered card count/content comes from the seed, `buyUrl` is not exposed as a UI link, images have useful alt text, and empty/error fallback copy is exact.
  - [x] Run `npm test`, `npm run lint`, `npm run build`, and a live `npm run dev` root-page smoke check. Manually inspect narrow and `lg` layouts for overflow and navigation placement.

## Dev Notes

### Developer context and scope

- This is the anonymous funnel's default landing experience and the stable trend-data foundation for Stories 1.3, 2.3, and 2.5. Preserve each trend's `id` and `shoeImageUrl` so later selection and YouCam `ref_file` work do not require a schema rewrite.
- `label` is explicitly required because it is visible content and supplies the basis for image alt text. Keep `buyUrl` as `string | null`: the property is always present for schema stability, while `null` represents the Story 2.5 no-retailer case.
- Scope includes only feed data, presentation, loading/empty handling, and the responsive navigation shell. Exclude card selection, detail navigation, foot-photo upload, manual overlay, registration CTA, Buy Now behavior, MongoDB, Cloudinary, YouCam, authentication, and all new external-service dependencies.
- Do not build runtime checks for image dimensions, file size, or shoe framing. Those are authoring-time curation requirements. Structural JSON validation is still required so malformed content fails safely.

### Architecture compliance

- Follow the existing App Router and one-way boundary. `app/page.tsx` owns composition, `app/components/*` owns reusable presentation, and `lib/data/trends.ts` is the sole seed reader. No service layer is needed because this story has no business orchestration.
- Prefer server rendering. A local JSON seed does not justify client fetching, `useEffect`, loading state in React, or a self-referential HTTP request. Use the App Router loading boundary for skeleton UI.
- Use strict TypeScript, `import type` for type-only imports, the `@/*` alias, default export for the page, and named exports for components.
- Current runtime versions are the implemented Story 1.1 baseline in `package.json` (Next.js 16.3.1, React 19.2.8, Node 24.x), which supersedes the older planning baseline. Add no dependency for this story.

### Existing files to preserve

- `app/page.tsx` currently renders only a centered `What the Heel` heading. Replace that placeholder with the feed but retain a clear accessible level-one product/feed heading.
- `app/layout.tsx` supplies the metadata, language, and dark global body shell. Do not move page-specific feed markup into the layout or regress its test.
- `app/globals.css` already establishes dark color-scheme and base font variables. Extend it without restoring light-mode media rules or remote font dependencies.
- `app/__tests__/page.test.tsx` currently asserts the placeholder heading. Update it for the feed contract; do not leave a stale test or weaken it to a content-free render assertion.
- Story 1.1 review changes are present in the working tree. Preserve them and avoid unrelated formatting or dependency churn.

### UX implementation guardrails

- Mobile base: 16px side padding, two-column grid, 8px gutters, fixed bottom nav. Add enough bottom padding, including `env(safe-area-inset-bottom)`, that the nav never obscures the last card.
- Desktop at `lg`: top navigation with wordmark left and Feed / AI Stylist / Profile right; three or four grid columns. Keep the same active lime fill plus pink hard shadow language instead of introducing an underline.
- Trend cards: white paper surface, black copy, square corners, 3px ink border, `4px 4px 0` ink shadow, product image, and uppercase heavy label. Optional HOT/NEW/fire metadata is not required by the seed schema and must not displace the required label.
- Marquee copy: `NEW DROPS DAILY ★ Y2K IS BACK ★ COP BEFORE IT'S GONE`. It pauses on hover/focus and becomes static for reduced-motion users; duplicated loop content is hidden from assistive technology.
- Pink is not small text. Purple small/meta text is allowed only on paper. Body copy uses white on ink; focus uses a 3px lime outline with 2px offset.
- Until future route stories exist, represent AI Stylist and Profile as clearly unavailable, non-link navigation labels. Do not point them at `#`, `/`, or nonexistent routes.

### Testing requirements

- Jest + React Testing Library tests remain co-located under `__tests__/` with `.test.tsx` names. Every new synchronous component needs a render-smoke test with meaningful role/name assertions.
- Treat `app/page.tsx` as an async Server Component if its reader is async; cover the synchronous presentation separately with Jest/RTL and reserve direct server-page flow coverage for an integration/E2E layer per project context.
- Data tests must isolate the filesystem and prove malformed/non-array/missing seeds return the safe state and log once, while invalid entries and duplicate IDs are handled deterministically. Tests must not rely on external image hosts or network access.
- Visual responsiveness needs a browser/manual check because jsdom does not apply Tailwind breakpoints or layout geometry.

### Previous story intelligence

- Story 1.1 established deterministic offline builds by avoiding remote fonts, root-level `app/` and `lib/` paths, Tailwind-only dark styling, and explicit lint/test/build/dev checks. Continue those patterns.
- The code review added a RootLayout smoke test, aligned Node types to Node 24, and documented the async Server Component testing policy. Do not reverse those corrections.
- Recent commits show the project is still at foundation stage; reuse the scaffold rather than re-running `create-next-app` or replacing configuration.

### Latest technical information

- Next.js 16 serves files in root `public/` from root-relative URLs, so `public/trends/example.jpg` is referenced as `/trends/example.jpg`. [Source: https://nextjs.org/docs/app/getting-started/installation]
- Use `next/image`, not the deprecated legacy image component. A dynamic string source needs explicit width/height or a positioned parent with `fill`; provide `sizes` for the responsive grid and useful `alt` text. Local URLs without query strings do not require image-host configuration. [Source: https://nextjs.org/docs/app/api-reference/components/image]
- Pages in the App Router are Server Components by default; keep the feed server-rendered because this story has no interaction requiring a client boundary. [Source: https://nextjs.org/docs/app/guides/migrating/app-router-migration]

### Project Structure Notes

Expected story footprint (adjust component factoring only when it improves clarity and tests):

```text
app/
  page.tsx                         # UPDATE: default feed page
  loading.tsx                      # NEW: feed skeleton
  globals.css                      # UPDATE: shared tokens/marquee motion as needed
  __tests__/page.test.tsx          # UPDATE or replace for server-page policy
  __tests__/loading.test.tsx       # NEW
  components/
    TrendCard.tsx                  # NEW
    AppNavigation.tsx              # NEW
    Marquee.tsx                    # NEW
    __tests__/
      TrendCard.test.tsx           # NEW
      AppNavigation.test.tsx       # NEW
      Marquee.test.tsx             # NEW
lib/
  data/
    trends.ts                      # NEW: typed local seed reader
    __tests__/trends.test.tsx       # NEW
public/
  trends.json                      # NEW
  trends/                          # NEW: curator-approved local product images
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Curated Trendsetter Feed Display]
- [Source: _bmad-output/planning-artifacts/prds/prd-whattheheel-2026-08-10/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Structural Seed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Capability → Architecture Map]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md#Components]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Responsive & Platform]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffolding-foundation.md#Previous Story Intelligence]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5.6)

### Debug Log References

- 2026-08-17: Confirmed the new tests failed before implementation because feed modules did not exist.
- 2026-08-17: `npm` PowerShell shim was blocked by the host execution policy; used the equivalent `npm.cmd` executable for validation.
- 2026-08-17: Live Next.js development server returned HTTP 200 and rendered both the feed heading and curated loafer content.
- 2026-08-17: Visually inspected headless Chrome captures at 500x844 (mobile layout) and 1440x1000 (desktop layout); grids and navigation switch as specified without horizontal overflow at the inspected viewports.

### Implementation Plan

- Build a synchronous, strictly typed server-side JSON reader with safe malformed/empty handling.
- Factor the feed into testable synchronous presentation components and keep future interactions inactive.
- Add locally generated spec-compliant product imagery and implement the approved responsive streetwear presentation.
- Prove the behavior through red-green component/data tests, lint, production build, asset inspection, and a live root-page smoke check.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added three unique, locally hosted 1254x1254 PNG product images, a curation record, and a stable nullable retail-link schema.
- Implemented the default anonymous feed as a static Server Component with a typed data boundary, safe invalid-data handling, responsive cards, marquee, navigation shell, skeletons, empty state, and accessibility semantics.
- Kept Story 1.3/2.5 behavior out of scope: trend cards and future navigation surfaces do not create broken links, and `buyUrl` is not rendered.
- Validation passed: 8 Jest suites / 13 tests, ESLint, Next.js production build, image dimension/size inspection, and live `GET /` HTTP 200.

### File List

- `_bmad-output/implementation-artifacts/1-2-curated-trendsetter-feed-display.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/__tests__/loading.test.tsx`
- `app/__tests__/page.test.tsx`
- `app/components/AppNavigation.tsx`
- `app/components/Marquee.tsx`
- `app/components/TrendCard.tsx`
- `app/components/TrendFeed.tsx`
- `app/components/__tests__/AppNavigation.test.tsx`
- `app/components/__tests__/Marquee.test.tsx`
- `app/components/__tests__/TrendCard.test.tsx`
- `app/components/__tests__/TrendFeed.test.tsx`
- `app/globals.css`
- `app/loading.tsx`
- `app/page.tsx`
- `lib/data/__tests__/trends.test.tsx`
- `lib/data/trends.ts`
- `public/trends.json`
- `public/trends/CURATION.md`
- `public/trends/burgundy-western-boot.png`
- `public/trends/chunky-platform-loafer.png`
- `public/trends/metallic-retro-runner.png`

## Change Log

- 2026-08-17: Created comprehensive implementation context and advanced the story to ready-for-dev.
- 2026-08-17: Implemented the curated trend feed and advanced the story to review.
