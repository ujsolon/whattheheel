# Change Requests

Product-owner requests raised **after** a story shipped, from hands-on use of the running app. Distinct from `deferred-work.md`, which holds engineering debt and known gaps found during review. These are deliberate product changes, not defects.

Status values: `open` → `ready-for-dev` (a story exists) → `done`.

---

## CR-01 — Default foot photos in the anonymous overlay preview

**Status:** open
**Raised:** 2026-08-19, from using the live app
**Surface:** `app/components/OverlayCanvas.tsx` (Story 1.3, FR-02)

Today the anonymous overlay preview renders an empty dashed dropzone until the visitor picks a photo of their own feet. That is a cold start on the product's very first interactive moment, and it asks for a camera-roll photo before the visitor has seen any value.

**Request:** ship one or more default foot photos preloaded into the canvas, so the overlay is immediately interactive on arrival. Uploading your own photo becomes an option rather than a precondition.

**Why it matters:** FR-02 exists specifically to deliver "immediate aesthetic value and zero friction, ahead of any registration ask" (epics.md, Epic 1). A mandatory upload is friction at exactly the point the funnel is designed to avoid it.

**Notes for whoever picks this up:**
- Needs curated default foot images in `public/`, subject to the same curator responsibility as the trend images (no runtime validation covers `public/` assets — see architecture Deferred).
- Decide whether it is one default or a small set the user can cycle (skin-tone and angle variety is the obvious reason to offer more than one).
- The existing upload path, its validation, and its object-URL cleanup should be left intact — this adds an initial state, it does not replace the picker.
- `app/loading.tsx`'s skeleton drift (see `deferred-work.md`) may become visible if this changes the initial render timing.

---

## CR-02 — Replace the gallery viewer's close button with bottom-nav exit

**Status:** open
**Raised:** 2026-08-19, from using the live app
**Surface:** `app/components/VtoResultViewer.tsx` (Story 2.7)

The full-image viewer for Past Try-Ons currently closes via a top-right `×` button, Escape, or a backdrop tap. The request is to drop the top close button and instead let the user exit through the bottom navigation — which is **not currently rendered** while the viewer is open, since the viewer is a `fixed inset-0 z-50` overlay that covers it.

**Request:** remove the top-right close control; make the bottom nav visible and usable as the exit route.

**Open questions to resolve before implementing** — this is a bigger change than it looks:
- The viewer is a full-screen overlay above `AppNavigation`. Exposing the nav means either lowering the overlay's z-index, insetting it above the nav, or converting the viewer from an overlay to a route (`/profile/history/[taskId]`), which was the fallback originally considered in Story 2.7 and rejected.
- Story 2.7's review added a **focus trap** and `aria-modal="true"` on the premise that the viewer is a self-contained layer. If the nav becomes reachable, that premise changes and the trap must be reconsidered — an `aria-modal` dialog with reachable outside controls is contradictory.
- Escape and backdrop-tap dismissal already exist. Confirm whether they stay (recommended — removing every keyboard exit would be an accessibility regression).
- EXPERIENCE.md's `{components.vto-result-viewer}` row documents the current close affordances and would need amending.

---

## CR-03 — Remove Buy Now from the feed cards

**Status:** open
**Raised:** 2026-08-19, from using the live app
**Surface:** `app/components/TrendCard.tsx`, `app/components/TrendFeed.tsx` (Story 2.8)

The feed-card Buy Now button shipped in Story 2.8 (2026-08-19) reads as too intrusive in the actual feed — it competes visually with the trend imagery and the try-on tap target.

**Request:** remove the Buy Now CTA from the Feed. Keep it on the VTO result and in the Past Try-Ons viewer.

**Note:** this partially reverses Story 2.8, which was itself a response to Buy Now being reachable *only* through a paid YouCam generation. The credit-cost concern that motivated 2.8 is still satisfied without the feed placement, because the Past Try-Ons viewer placement is free and requires no generation. So this is a narrowing, not a full revert.

**Implementation is already scoped for this** — 2.8 deliberately made the feed placement opt-in:
- Drop `showBuyLink` from `TrendFeed.tsx`'s `<TrendCard>` usage. The prop defaults to `false`.
- Consider whether `TrendCard`'s sibling-not-nested restructure and the `showBuyLink` prop should be removed entirely or kept dormant. **Recommendation: keep them.** The restructure is correct regardless, and the prop costs nothing while leaving the option open. Removing it would mean re-deriving the nested-`<a>` constraint later.
- Amend Story 2.5 AC4, Story 2.8 AC3/AC4, epics.md, and EXPERIENCE.md's trend-card row, all of which were updated on 2026-08-19 to describe the feed placement.
- The `TrendCard` tests asserting the feed CTA and the no-nesting guard should be retained (the component still supports it) but the feed-level integration expectation changes.
