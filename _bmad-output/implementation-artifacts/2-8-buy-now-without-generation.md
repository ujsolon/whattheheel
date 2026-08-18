---
baseline_commit: 8835ac1
---

# Story 2.8: Buy Now Without Spending Credits

Status: review

<!-- Added 2026-08-19, post-launch. Not in the original PRD FR list. Raised by the product owner immediately after Story 2.5's retail URLs went in: the Buy Now link was reachable ONLY through a successful VTO generation, so every path to a purchase link cost 2 YouCam units against a 1,000-unit allotment. This story amends Story 2.5's AC4 and extends 2.6/2.7 and the Feed. -->

## Story

As a shopper,
I want to reach a shoe's retail page without first paying for an AI generation,
so that finding where to buy something is never gated behind a metered API call.

## Problem

Story 2.5 scoped the Buy Now CTA to the live VTO success state, and its AC4 explicitly excluded every other surface including VTO history. That made the *only* route to a product link a successful YouCam generation (2 units each, ~500 total). Two concrete consequences:

1. Re-finding a product you already tried on costs credits again — the `trendId` was stored and the link was resolvable for free, but never projected out.
2. A visitor browsing the Feed cannot reach a retailer at all without registering, uploading a selfie, and spending a generation.

## Acceptance Criteria

1. **Given** a past try-on in the Past Try-Ons history whose trend has a `buyUrl`, **when** the user opens it in the full-image viewer, **then** the same locked Buy Now CTA appears, with no new network request and no YouCam call.
2. **Given** a past try-on whose trend has no usable `buyUrl` (null, or the trend no longer resolves), **when** the viewer opens, **then** no CTA and no placeholder renders — matching the existing hidden-not-disabled rule.
3. **Given** the Trendsetter Feed, **when** a trend card has a `buyUrl`, **then** a Buy Now action is reachable directly from the card, for anonymous and registered visitors alike, with no generation required.
4. **Given** a trend card, **when** it renders, **then** its primary tap target still opens the try-on path exactly as before, and the Buy Now action is a **sibling** of that target, never nested inside it — a nested `<a>`-in-`<a>` or `<a>`-in-`<button>` is invalid HTML and is re-parented by browsers.
5. **Given** the compact card variant used by the AI Stylist trend picker, **when** it renders, **then** it shows **no** Buy Now action — that surface is a selection control mid-flow, and a competing outbound link there would derail the trigger.
6. **Given** any Buy Now instance anywhere in the product, **when** rendered, **then** it uses the identical locked copy, `target="_blank"`, `rel="noopener"`, and `referrerPolicy="strict-origin-when-cross-origin"` established in Story 2.5 — defined in exactly one shared component, not re-implemented per surface.
7. **Given** this change, **when** complete, **then** no new API route, collection, service, or external dependency is introduced; history reuses the `Trend` already resolved server-side in `getVtoHistory`, and the Feed reuses the `Trend` it already renders.

## Tasks / Subtasks

- [x] Extract the Buy Now CTA into one shared component (AC: 6)
  - [x] Add `app/components/BuyNowLink.tsx` carrying the locked copy, the external-link attributes, the screen-reader "(opens in a new tab)" hint, and the `{components.buy-now-button}` styling exactly as Story 2.5 (and its code review) settled them. Props: `{ buyUrl: string; label?: string }`.
  - [x] Replace the inline anchor in `VtoStylist.tsx`'s success block with it. Behavior and markup must be unchanged — the existing Story 2.5 assertions should pass untouched.
- [x] Surface Buy Now in VTO history (AC: 1, 2, 7)
  - [x] Add `buyUrl: string | null` to `VtoHistoryItem` and map it in `getVtoHistory` from the `Trend` already resolved there via `getTrendById`. No new query, no new field on `vto_tasks` — `trendId` is already persisted.
  - [x] Render `BuyNowLink` in `VtoResultViewer` (Story 2.7) below the zoom controls, only when `item.buyUrl` is present. Deliberately NOT in the grid tiles: those are `<button>`s, so a nested link would be invalid (AC4's rule), and a 2–3 column thumbnail is the wrong place for a purchase CTA.
  - [x] Keep the viewer's existing focus trap correct — the CTA becomes part of the trapped tab cycle.
- [x] Make the Feed card's Buy Now reachable without generation (AC: 3, 4, 5)
  - [x] Restructure `TrendCard` so the primary action (`<Link>` in feed mode, `<button>` in picker mode) wraps only the image and label, and any Buy Now renders as a sibling inside a non-interactive card container. Preserve the explicit `aria-label={trend.label}` that Story 1.3's review added to fix a doubled-accessible-name bug.
  - [x] Add an opt-in `showBuyLink?: boolean` prop, default `false`. `TrendFeed` passes `true`; the AI Stylist picker does not (AC5).
- [x] Reconcile the specs this amends (AC: 1, 3)
  - [x] Story 2.5 AC4 and epics.md: Buy Now is no longer VTO-result-only.
  - [x] EXPERIENCE.md: the trend-card row currently says "Long-press/hover: none (no secondary action)", and the Buy Now row scopes the CTA to the VTO Result surface. Both need to reflect the Feed and history placements.
- [x] Verify (AC: 1-7)
  - [x] Tests: history item carries `buyUrl`; viewer shows/hides the CTA; feed card exposes it and the picker variant does not; no nested interactive elements; all Story 2.5 CTA assertions still pass via the shared component.
  - [x] `npm test`, `npm run lint`, `npm run build`.

## Dev Agent Record

### Agent Model Used

Claude (Opus 5)

### Debug Log References

### Completion Notes List

### File List

- `app/components/BuyNowLink.tsx` (new — single definition of the locked CTA)
- `app/components/VtoStylist.tsx` (updated — success block uses the shared component)
- `app/components/VtoResultViewer.tsx` (updated — CTA for past try-ons)
- `app/components/TrendCard.tsx` (updated — sibling-not-nested restructure, `showBuyLink` opt-in)
- `app/components/TrendFeed.tsx` (updated — enables `showBuyLink`)
- `lib/services/vtoTask.ts` (updated — `VtoHistoryItem.buyUrl` projected from the already-resolved Trend)
- `app/components/__tests__/TrendCard.test.tsx`, `VtoResultViewer.test.tsx`, `VtoHistoryGrid.test.tsx` (updated)
- `lib/services/__tests__/vtoTask.test.tsx`, `app/profile/__tests__/page.test.tsx` (updated)
- `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md` (updated — trend-card + Buy Now rows)
- `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/implementation-artifacts/2-5-retail-buy-now-links.md` (updated — AC4 amended)

## Change Log

- 2026-08-19: Implemented. Buy Now is now reachable from the Feed and from the Past Try-Ons viewer, not only after a paid VTO generation. History gained `buyUrl` by projecting the `Trend` `getVtoHistory` already resolved — no new query, no schema change, no YouCam call. The CTA moved into one shared `BuyNowLink` so the locked copy and external-link attributes cannot drift across the three surfaces. `TrendCard` was restructured so the try-on target and Buy Now are siblings: nesting an `<a>` inside the card's `<a>`/`<button>` is invalid HTML that browsers re-parent, which would have silently broken one of the two actions. The compact picker variant deliberately shows no CTA. Amended Story 2.5 AC4, epics.md, and EXPERIENCE.md's trend-card and Buy Now rows. 320 tests, lint, and build green.
