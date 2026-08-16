# PRD ↔ UX Spine Fidelity Reconciliation

**Scope:** Checks DESIGN.md + EXPERIENCE.md (ux-whattheheel-2026-08-17) against prd-whattheheel-2026-08-10/prd.md for coverage/contradiction of FRs, NFRs, quiet requirements, Assumptions/Open Items, and User Journey fidelity. Visual quality, mermaid syntax, and general spine shape are explicitly out of scope (covered by another reviewer).

## Verdict

The UX spine pair faithfully covers the PRD. All six FRs are addressed, both NFR performance/cost logics are reflected, both User Journeys map cleanly onto EXPERIENCE.md's two Key Flows, and — most critically — all five user-facing locked FR-06 error strings appear **character-for-character verbatim**, with `invalid_parameter` correctly kept non-user-facing. No FR, NFR, or Assumption is missing or contradicted. Only minor, low-severity gaps found.

## FR-by-FR check

| FR | PRD requirement | Spine coverage | Verdict |
|---|---|---|---|
| FR-01 | Trendsetter Feed, JSON-backed, curated images meeting YouCam Product Image spec (≥512×512, shoe >25% frame) for reuse as `ref_file` | EXPERIENCE.md IA table ("Feed... Curated trend gallery (FR-01)"), State Patterns (empty/loading feed), DESIGN.md trend-card component | Covered for the UX-visible part. The specific image-spec sub-clause (reuse as `ref_file` without reprocessing) is a data-curation/architecture detail, not user-facing UX — reasonably out of scope for a UX spine. See minor note below. |
| FR-02 | Manual client-side overlay, no ML/API, offline, zero marginal cost | EXPERIENCE.md Foundation ("fully client-side, zero backend cost per architecture AD-3"), `OverlayCanvas.tsx` component pattern ("Client-only, no network call") | Full match, including the cost-zero framing. |
| FR-03 | Registration/Profile auth flow, store selfie | Registration/Login form, Selfie Upload, Profile surfaces (IA table, Component Patterns) | Full match. |
| FR-04 | YouCam `/s2s/v2.0/task/shoes` VTO integration | AI Stylist trigger → `POST /api/vto-tasks`, VTO Polling, VTO Result | Full match. |
| FR-05 | "Buy Now" retail links | Buy Now button/link component: hidden (not disabled) when `buyUrl` absent, opens new tab | Full match, plus sensible elaboration (Story 2.5 reference). |
| FR-06 | Inline (not modal) error, copy tailored to error code, "try another photo" reopens upload | Inline error component, Voice and Tone locked-copy table, "Try another photo" reopens Selfie Upload in place | Full match — see verbatim string check below. |

## FR-06 locked-copy verbatim check

All five user-facing strings in EXPERIENCE.md's Voice and Tone table were compared word-for-word against PRD §5 "VTO Error Handling":

- `error_no_face`: "We couldn't detect a face — try a front-facing selfie with good lighting." — **exact match**
- `error_download_image`: "We couldn't load one of the images — please try uploading again." — **exact match**
- `error_inference`: "Something went wrong generating your preview — please try again." — **exact match**
- `error_nsfw_content_detected`: "This image can't be used — please choose a different photo." — **exact match**
- `exceed_max_filesize`: "That image is too large (max 10MB) — please choose a smaller file." — **exact match**
- `invalid_parameter`: PRD says "internal/logged only, not user-facing." EXPERIENCE.md adds that the user is shown the `error_inference` copy instead (attributed to architecture AD-6). This is an elaboration, not a contradiction — PRD is silent on what (if anything) the user sees for this code, and the added behavior is sourced to the architecture spine rather than invented.

No paraphrasing, no dropped strings, no rewritten punctuation/em-dashes.

## NFR check

- **Performance (polling):** PRD requires polling + managing expectations during inference. EXPERIENCE.md's "VTO polling / loading state" pattern (2s poll interval, rotating status copy, 30s "still working" fallback) satisfies and usefully concretizes this.
- **Security (env vars for API keys):** Correctly absent from UX docs — not a UX-layer concern.
- **UX (seamless staged funnel):** EXPERIENCE.md Foundation states the funnel logic explicitly ("get an anonymous visitor far enough into the manual preview that registering... feels like the obvious next tap") and the gating rules (IA table) implement it without dead-end screens.
- **Image Constraints:** The exact numeric/format constraints (selfie min 512×512, face >15%, top-of-head-to-chest framing; shoe dimensions; jpg/jpeg/png/heic, <10MB) are not restated as user-facing instructional copy anywhere in DESIGN.md or EXPERIENCE.md — see minor finding below.
- **Cost Management:** PRD's "VTO cost isolated to registered users, anon stays free" logic is explicitly reflected in EXPERIENCE.md Foundation ("fully client-side, zero backend cost per architecture AD-3") and reinforced narratively in Flow 1's climax beat.

## Assumptions & Open Items check

- Both PRD [ASSUMPTION]s (curated JSON sufficiency; manual overlay driving registration reinforced by cost logic) are reflected — the second is dramatized almost verbatim in Flow 1 step 5's "Climax" beat.
- Both [RESOLVED] items (image format requirements, VTO failure fallback UI) are correctly treated as settled and incorporated rather than re-opened.
- No PRD [OPEN ITEM] exists to check (PRD has none outstanding), so nothing is missing there.

## User Journey → Key Flow fidelity

- **Journey 1 (Trend Discovery, Anonymous)** maps step-for-step onto EXPERIENCE.md Flow 1 (Priya): feed landing → browse → select+overlay preview with own foot photo → registration CTA. Fidelity is high, including the failure branch (backing out with no photo = empty state, not an error).
- **Journey 2 (Premium AI-Stylist, Registered)** maps onto Flow 2 (Jordan): register+selfie → select trend → trigger VTO → visualize + retail link. The flow adds a first-attempt `error_no_face` retry beat not in the PRD's terse journey text, but this is a legitimate dramatization of FR-06 rather than a deviation, and step order/intent match the PRD exactly.

## Minor findings (low severity, no action required)

1. **PRD's specific image-constraint values (selfie framing "top-of-head to chest," dimension minimums, format list) are never surfaced as user-facing instructional/dropzone copy** in EXPERIENCE.md — the user only learns about them via a validation failure, not proactive guidance. This is arguably intentional (PRD didn't mark these as locked copy the way FR-06 was), and Flow 2's narrative does show a plausible instance (group shot fails, half-body shot passes), but a stricter reading could call this a dropped "quiet requirement."
2. **FR-01's sub-clause** that curated trend images must meet the YouCam Product Image spec so they're reusable as `ref_file` without reprocessing is not mentioned in either spine document. This is a data-curation/backend concern rather than a UX-behavior concern, so its absence from a UX spine is defensible, but it is technically part of FR-01's stated text.
3. **EXPERIENCE.md cites "PRD NFR1" and "PRD NFR3"** for the polling and funnel-logic requirements, but the PRD's Non-Functional Requirements section is an unordered bullet list (Performance, Security, UX, Image Constraints, Cost Management) with no NFR numbering at all. The content mapping is correct (NFR1→Performance, NFR3→UX bullet), but the citation format implies a numbered source that doesn't exist verbatim in the PRD — a minor traceability nit, not a content-fidelity problem.

None of the three items above rise to a missing/contradicted FR, NFR, Assumption, or Journey — they are presentation/traceability nits at most.
