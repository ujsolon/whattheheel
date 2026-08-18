---
baseline_commit: b3442537b1755894884d1beefcfc78ab39633aca
---

# Story 2.5: Retail Buy Now Links

Status: done

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

### Review Findings

_Code review 2026-08-18 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, all findings verified against live code; validator gaps confirmed by executing the predicate)._

**Clean verdicts on the three highest-risk spec items:** the locked hype-register string is byte-identical to EXPERIENCE.md (`Heel Yes` + U+2014 + `Buy Now` + U+2192); the `{components.buy-now-button}` DESIGN token conforms down to the `shadow-[5px_5px_0_var(--color-pink)]` spelling and the 44px target; and the render contract (hidden entirely when absent, never disabled/grayed, native `<a>` with `target="_blank"`) matches the Component Patterns row exactly.

- [x] [Review][Decision-Resolved] **The product's only outbound link ships with neither a referrer decision nor a `Referrer-Policy`** — `app/components/VtoStylist.tsx:344-345`. `target="_blank"` already implies `noopener` in every current browser, so `rel="noopener"` restates the default rather than adding the tabnabbing defense the AC treats it as (it is what EXPERIENCE.md specifies, so it stays either way). The substantive gap is that `noreferrer` was deliberately declined — the story's Dev Notes cite preserving "future retailer/affiliate attribution" — for an affiliate program that does not exist, against a `Trend` schema with no affiliate field, while `next.config.ts` sets no `Referrer-Policy` at all. So the app leaks a full referrer to third-party retailers by browser default, not by choice. This is a business call (privacy vs. future attribution), not a correctness one — see the options presented at review time.
- [x] [Review][Patch] **Buy Now can point at a shoe that was never generated** — all three layers found this independently. The in-surface trend picker renders on `{!initialTrend && …}` with **no phase guard**, so it stays live and clickable during `pending` and `success`, and `onSelect={setSelectedTrend}` mutates `selectedTrend` without touching `resultUrl` or `phase`. Reachable in production whenever `/stylist` is opened without `?trend=` (`app/stylist/page.tsx:13` sets `initialTrend` to `undefined`). Generate trend A, tap trend B's card: the result image is still A, but `href` is now B's retailer and the `alt` relabels A's photo as B. Switching mid-`pending` is worse — the POST already pinned `trendId: A`, and there is no image on screen to reveal the drift. Story 2.3 seeded this as a cosmetic alt-text bug (which is live *today*, with no `buyUrl` needed); 2.5 turns it into a purchase-routing bug. Fix: freeze the trend at trigger time and render the result block from that, and reset to `idle` when the selection changes out from under a terminal result [app/components/VtoStylist.tsx:259-271,330-350]
- [x] [Review][Patch] **An invalid or absent `buyUrl` deletes the entire trend rather than just its link** — verified by execution: an absent key makes `candidate.buyUrl !== null` true and `isCleanAbsoluteHttpsUrl(undefined)` false, so `validateTrend` rejects and `getTrends()` `continue`s past the whole entry. Blast radius is wildly disproportionate to a cosmetic field: the shoe vanishes from the Feed, the Stylist picker, and `getTrendById` (so `/stylist?trend=<id>` silently degrades to "no trend"), and `lib/services/vtoTask.ts`'s history mapping drops already-generated results whose trend no longer resolves. Directly contradicts epics.md ("the Buy Now **button** is hidden rather than showing a broken link") and makes AC3's own "malformed" branch unreachable at runtime — such a trend can never be *selected*. One `http://` typo or one forgotten key at content time takes out the AI centerpiece. Fix: treat an invalid `buyUrl` as "no buy link" (coerce to `null`, log it) instead of rejecting the entry [lib/data/trends.ts:46-48,63-68]
- [x] [Review][Patch] `isCleanAbsoluteHttpsUrl` is materially looser than its name and error message — all confirmed by executing the predicate: `https://retailer.example@evil.example/x` is **accepted and resolves to `evil.example`** (userinfo masquerading as the host), `https://user:pass@host/x` ships credentials in an `href`, `https://evil.example/x` and `https://good.example\t/x` pass because `String.trim()` does not strip C0 controls while the URL parser silently does, `https:retailer.example/x` and `https:/retailer.example/x` pass via special-scheme slash tolerance, `https://example.com\evil` passes where the sibling `shoeImageUrl` validator explicitly rejects backslashes, and `https://localhost:3000/x` passes. Harden with `new URL(value).href === value`, empty `username`/`password`, and a backslash guard [lib/data/trends.ts:17-25]
- [x] [Review][Patch] `http://` — the single most likely curator mistake, and the exact value the new `protocol === "https:"` check exists to catch — is absent from the rejection test matrix, which instead covers values no curator would type (`javascript:`, `data:`, `"not a url"`) [lib/data/__tests__/trends.test.tsx]
- [x] [Review][Patch] The seed guard re-implements the check inline (`new URL(...).protocol`) instead of calling the real validator, so it cannot catch any of the divergences above; it also *throws* `TypeError: Invalid URL` on malformed input rather than asserting, giving a curator an opaque stack trace instead of the intended message. Export and use the validator [lib/data/__tests__/trends.seed.test.tsx]
- [x] [Review][Patch] No indication the link leaves the app — no visually-hidden "(opens in a new tab)", no `aria-describedby`, no external-link affordance. Screen-reader and cognitive-accessibility users get an unannounced context switch to a third-party domain, against the project's Accessibility Floor [app/components/VtoStylist.tsx:342-349]
- [x] [Review][Patch] AC4's `pending` state is never asserted — the tests cover idle, error, and reupload, but pass straight from `fireEvent.click` to `findByRole("link")` without checking the CTA is absent while polling [app/components/__tests__/VtoStylist.test.tsx]
- [x] [Review][Patch] The style assertion re-types the implementation's own class strings and omits precisely the tokens AC5 locks by name — `border-ink`, `text-ink`, and the `focus-visible` ring — so none of AC5's named properties are meaningfully guarded [app/components/__tests__/VtoStylist.test.tsx]
- [x] [Review][Patch] AC3's "malformed / not absolute HTTPS" branch has no component-level test (only `buyUrl: null` is covered). Becomes genuinely reachable once the trend-deletion fix above lands [app/components/__tests__/VtoStylist.test.tsx]
- [x] [Review][Patch] AC4's "absent from VTO-history surfaces" has no regression guard. Trivially true today, but `lib/services/vtoTask.ts`'s history mapping already re-resolves the full `Trend` server-side, so the field is one careless spread from the payload [lib/services/__tests__/vtoTask.test.tsx]
- [x] [Review][Patch] `baseline_commit: b3442537b1755894884d1beefcfc78ab39633aca` in a repo with clean git history, so the story had no verifiable baseline — set it to the real one (`b344253`) [2-5-retail-buy-now-links.md]
- [x] [Review][Patch] Cross-artifact drift: epics.md still says Story 2.5 is "UI-only, reusing existing trend data" while this story authorized (and shipped) a `lib/data/trends.ts` change, and ARCHITECTURE-SPINE's FR-05 row still maps Buy Now to "feed/detail components" when the contract is now VTO-result-only [epics.md, ARCHITECTURE-SPINE.md]
- [x] [Review][Defer] Every production `buyUrl` is `null`, so FR5's headline capability is not demonstrable in the built product — the CTA renders only in fixtures [public/trends.json] — deferred, this is a curated-content dependency the story explicitly authorized, not a code defect; logged so it is tracked rather than closing silently with the epic
- [x] [Review][Defer] `href={selectedTrend.buyUrl}` has no render-time defense, resting entirely on the undocumented invariant that every `Trend` originates from `getTrends()`; `Trend.buyUrl` is a plain `string | null`, not a branded type [app/components/VtoStylist.tsx:343] — deferred, the invariant holds at every current call site; revisit if a future surface ever constructs a `Trend` from request data

**Dismissed as noise:** (1) that CSS `uppercase` makes the rendered pixels differ from AC1's literal mixed-case string — the DOM text and accessible name are byte-exact and DESIGN.md itself assigns the uppercase label token to this component; (2) the "unconditional wrapper div" around the result block — it is a legitimate grouping element for image + CTA, not dead structure.

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
- `_bmad-output/planning-artifacts/epics.md` — *added by the 2026-08-18 code review:* the Story 2.5 "UI-only" clause now reflects the authorized `lib/data/trends.ts` hardening.
- `_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md` — *added by the 2026-08-18 code review:* the FR-05 capability row said "feed/detail components"; corrected to VTO-result-only, matching EXPERIENCE.md and the implementation.

## Change Log

- 2026-08-18: Created implementation-ready Story 2.5 with live-result-only scope, HTTPS retail-link validation, locked CTA UX, regression coverage, and an explicit demo-content dependency without fabricated URLs.
- 2026-08-18: Implemented US 2.5, added URL/CTA regression coverage, passed 298 tests plus lint/build, and advanced the story to review.
- 2026-08-18: Code review (3 parallel layers). **Clean on the highest-risk spec items** — locked hype string byte-identical to EXPERIENCE.md, `{components.buy-now-button}` token conformant, render contract exact. Two must-fix defects, each found independently by all three layers: (1) the in-surface trend picker had no phase guard, so switching shoes after a result rendered repointed the Buy Now link and alt text at a shoe that was never generated — a purchase-routing bug (the alt-text half was already live). Fixed by freezing the trend at trigger time into `resultTrend` and resetting to idle when the selection changes under a terminal result. (2) An invalid or absent `buyUrl` rejected the **entire trend**, deleting the shoe from the feed, picker, deep links, and history-label resolution over a cosmetic field — contradicting epics.md's "the *button* is hidden". Fixed by normalizing an unusable value to `null` instead. Also hardened `isCleanAbsoluteHttpsUrl`, which (verified by execution) accepted `https://retailer.example@evil.example/x` resolving to `evil.example`, embedded credentials, C0-control-prefixed URLs, `https:host` shorthand, backslashes, and unbounded length. Resolved the referrer decision in favour of `referrerPolicy="strict-origin-when-cross-origin"`, added a screen-reader "(opens in a new tab)" hint, added the missing `pending`-state and AC5-token assertions, made the seed guard call the real validator, and reconciled two stale planning artifacts. 2 items deferred (the curated-content dependency and render-time href hardening). Full suite (311 tests), lint, and build green. Advanced to done.
