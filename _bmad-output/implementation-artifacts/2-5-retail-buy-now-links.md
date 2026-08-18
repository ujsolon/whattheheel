---
baseline_commit: NO_VCS
---

# Story 2.5: Retail Buy Now Links

Status: review

## Story

As a registered user viewing my VTO result,
I want a “Buy Now” link for the shoe,
so that I can purchase it directly.

## Acceptance Criteria

1. Given a successful VTO result and a selected trend with a valid `buyUrl`, when the result is displayed, then a semantic link with the visible copy `Heel Yes — Buy Now →` appears directly beneath the result and uses that selected trend's `buyUrl`.
2. Given the Buy Now link, when it is activated, then the retail destination opens in a new tab while the current app tab and VTO result remain intact; the link uses `target="_blank"` and `rel="noopener"`.
3. Given a selected trend whose `buyUrl` is `null`, absent, malformed, or not an absolute HTTPS URL, when any VTO state is rendered, then no Buy Now link or disabled placeholder is rendered.
4. The link appears only in the live `VtoStylist` success state with a result image; it is absent from idle, pending, error, reupload, and VTO-history surfaces.
5. The CTA matches `{components.buy-now-button}`: full-width lime fill, ink text and 3px ink border, square corners, 5px down-right pink hard shadow, label typography, at least a 44px target, and the established 3px lime focus-visible outline with 2px offset.
6. Retail-link support remains UI/static-content only: it reuses `Trend.buyUrl` from the curated trend seed and introduces no API route, database field/collection, service, external SDK, dependency, tracking, checkout, or price model.
7. Automated tests prove the success/valid-URL path, null/unsafe-URL hiding, success-only visibility, exact destination/new-tab attributes, and preservation of existing VTO interactions; lint, test, and production build pass.

## Tasks / Subtasks

- [x] Harden the existing curated trend boundary (AC: 3, 6)
  - [x] Update `lib/data/trends.ts` so a non-null `buyUrl` is accepted only when it is already clean (no surrounding whitespace), parses as an absolute URL, and uses `https:`. Keep `null` valid.
  - [x] Preserve the existing deterministic invalid-entry behavior: an unsafe non-null `buyUrl` makes that seed entry invalid and logs the established sanitized index/reason message; do not silently rewrite it or move validation into the client.
  - [x] Extend `lib/data/__tests__/trends.test.tsx` for valid HTTPS and rejected `javascript:`, `data:`, relative, protocol-relative, whitespace-padded, malformed, empty, and non-string values.
  - [x] Strengthen `lib/data/__tests__/trends.seed.test.tsx` so every real non-null `buyUrl` is a clean absolute HTTPS URL.
- [x] Add the conditional retail CTA to the existing VTO result (AC: 1-6)
  - [x] Update only the `phase === "success"` result surface in `app/components/VtoStylist.tsx`; retain the full selected `Trend` as the sole retail-link source and do not add retail data to VTO request/poll responses.
  - [x] Keep the existing result image and label behavior intact. Render a normal semantic `<a>` directly beneath the image only when `selectedTrend.buyUrl` is present after trusted seed validation.
  - [x] Apply the exact copy, external-link attributes, mobile-first sizing, focus treatment, and locked sticker styling from the acceptance criteria. Do not use `window.open`, a click handler, `next/link`, a button, or a disabled fallback.
  - [x] Do not add a price: the `Trend` contract has no price field and Story 2.3 deliberately deferred Buy Now without inventing one.
- [x] Add focused regression coverage (AC: 1-7)
  - [x] Extend `app/components/__tests__/VtoStylist.test.tsx` with a valid-HTTPS trend fixture and a named test asserting exact accessible link name, `href`, `_blank`, and `noopener` after polling succeeds.
  - [x] Assert no Buy Now link for a null-URL trend after success and no link for a URL-bearing trend during idle, pending, error, or reupload states.
  - [x] Cover both a carried-over trend and an in-surface selected trend sufficiently to prove the CTA always belongs to the exact selected trend; preserve all polling, same-task retry, error, and reupload tests.
  - [x] Assert semantics and critical style tokens without attempting to simulate browser popup behavior in jsdom.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.
- [x] Resolve demo content separately from implementation (AC: 1, 3, 6)
  - [x] Do not fabricate retailer destinations. If the product owner supplies verified product URLs, add them to the matching `public/trends.json` entries and verify them manually before submission.
  - [x] If no destinations are supplied, leave the seed values `null` and record in Completion Notes that the live CTA is intentionally hidden pending curated retail content; tests must still demonstrate the completed conditional feature.

## Dev Notes

### Implementation guardrails

- This is a narrow client/static-data story. `VtoStylist` already owns `selectedTrend`, the result phase, and the generated `resultUrl`; extend that component rather than creating a second result component or fetching trend data again.
- Use a native anchor for the external retailer. The app must remain on the generated result, and no client event handler is needed to open the new tab.
- Validate the URL once at the trusted seed-ingestion boundary. The client receives server-validated trends and should not duplicate parsing logic. Never render user-controlled query parameters as retail destinations.
- Keep `rel="noopener"` exactly as the UX contract requires. Do not add `noreferrer` without a product decision because suppressing the referrer may affect future retailer/affiliate attribution.
- The current curated seed contains five trends and every `buyUrl` is `null`. That is valid and must hide the CTA. Static verified URLs are compatible with the architecture's hackathon path; a live retail/affiliate source remains deferred.
- Scope is the current live VTO success result only. Stories 2.6/2.7 history DTOs expose `trendLabel` and `resultUrl`, not `buyUrl`; do not expand history, APIs, or stored VTO documents for this story.
- Preserve Story 2.4's inline failure/reupload flows and Story 2.3's polling/retry behavior. The CTA must not exist until a successful result image exists.
- `EXPERIENCE.md` mentions an aspirational result price row, but no price exists in the canonical schema or this story's ACs. Adding one would be unsupported scope expansion.
- Before implementation, follow `AGENTS.md` and read the relevant installed Next 16 documentation under `node_modules/next/dist/docs/`. No new Next API is expected here.

### Existing files to update

```text
app/components/VtoStylist.tsx
app/components/__tests__/VtoStylist.test.tsx
lib/data/trends.ts
lib/data/__tests__/trends.test.tsx
lib/data/__tests__/trends.seed.test.tsx
public/trends.json                         # only when verified retailer URLs are supplied
```

Do not create or change files under `app/api/`, `lib/services/`, `lib/external/`, MongoDB repositories, authentication, Cloudinary, or YouCam.

### Testing notes

- Jest/React Testing Library tests remain co-located under `__tests__/` with the project's `.test.tsx` convention.
- jsdom cannot prove that a browser opened a real tab. The reliable automated contract is the semantic anchor plus exact `href`, `target`, and `rel`; manual browser verification is appropriate once a real retailer URL exists.
- Query by accessible link name so the test protects the locked CTA copy and semantics. Keep CTA routing coverage in its own clearly named test rather than burying it in a broad polling test.
- A malformed seed entry must never reach `href`. Test the data boundary independently and use a valid fixture for component behavior.

### Previous-story intelligence

- Story 1.2 established `Trend { id, label, shoeImageUrl, buyUrl: string | null }` and reserved rendering the field for Story 2.5.
- Story 2.3 created `VtoStylist`, deliberately omitted price/Buy Now, and retained the full selected trend in the client; this story completes that deferred UI seam.
- Story 2.4 owns result error/recovery and inline selfie replacement. Do not disturb those phase transitions.
- Stories 2.6 and 2.7 own Past Try-Ons and its full-image viewer. Retail links are not part of their DTO or surface.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Retail Buy Now Links]
- [Source: _bmad-output/planning-artifacts/prd/prd-whattheheel-2026-08-16/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Requirements to Structure Map]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Deferred]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Journey Flows]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md#Component Styling]
- [Source: _bmad-output/implementation-artifacts/1-2-curated-trendsetter-feed-display.md]
- [Source: _bmad-output/implementation-artifacts/2-3-ai-virtual-try-on-generation.md]
- [Source: _bmad-output/implementation-artifacts/2-4-vto-failure-handling.md]
- [Source: _bmad-output/implementation-artifacts/2-6-vto-result-history.md]
- [Source: _bmad-output/implementation-artifacts/2-7-vto-history-full-image-viewer.md]
- [Source: app/components/VtoStylist.tsx; lib/data/trends.ts; public/trends.json — current implementation inspected during story creation]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-08-18: Followed red-green-refactor. New URL-safety and CTA tests initially failed against the permissive validator/missing result link, then passed after the minimal data-boundary and success-state changes.
- 2026-08-18: Git baseline capture was unavailable because the sandbox rejected repository ownership; recorded `NO_VCS` as required by the workflow.

### Completion Notes List

- Added clean absolute HTTPS validation for every non-null curated `buyUrl`; unsafe schemes, relative/malformed URLs, whitespace-padded values, and invalid types are rejected before reaching UI props.
- Added the exact `Heel Yes — Buy Now →` semantic external link to the successful live VTO result only, with locked new-tab, styling, focus, and touch-target behavior.
- Added coverage for carried-over and in-surface trend selection, null links, non-success phases, unsafe seed values, and real-seed conformance.
- All five production seed `buyUrl` values remain `null` because no verified retailer destinations were supplied. The live CTA is intentionally hidden until curated retail content is added; the conditional feature is proven by fixtures.
- Verification passed: 298 tests across 34 suites, ESLint, TypeScript/Next.js production build.

### File List

- `app/components/VtoStylist.tsx` (updated)
- `app/components/__tests__/VtoStylist.test.tsx` (updated)
- `lib/data/trends.ts` (updated)
- `lib/data/__tests__/trends.test.tsx` (updated)
- `lib/data/__tests__/trends.seed.test.tsx` (updated)
- `_bmad-output/implementation-artifacts/2-5-retail-buy-now-links.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

## Change Log

- 2026-08-18: Created implementation-ready Story 2.5 with live-result-only scope, HTTPS retail-link validation, locked CTA UX, regression coverage, and an explicit demo-content dependency without fabricated URLs.
- 2026-08-18: Implemented US 2.5, added URL/CTA regression coverage, passed 298 tests plus lint/build, and advanced the story to review.
