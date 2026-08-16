# PRD ↔ Architecture Spine Reconciliation Review

**Scope:** Fidelity only — does ARCHITECTURE-SPINE.md faithfully and completely cover what the PRD (prd-whattheheel-2026-08-10) states as load-bearing? Code style, mermaid validity, and general architecture quality are explicitly out of scope (covered by another reviewer).

**Verdict: Mostly faithful.** All six FRs are bound and mapped, and the two heaviest quiet requirements — cost isolation (AD-3) and inline/no-modal error UI (AD-6) — are captured well. Two gaps are worth fixing before build starts; the rest are minor.

---

## Findings

### 1. (Moderate) FR-01's "reusable as ref_file without reprocessing" constraint has no architectural home

PRD FR-01 states curated trend images "must meet the YouCam Product Image spec (≥512x512, shoe >25% of frame height) so they're reusable as `ref_file` input for Journey 2 without reprocessing." This is a real cross-FR constraint: it links the *curation quality* of FR-01's dataset directly to FR-04's VTO call working without an extra upload/validation round-trip.

The spine's only validation invariant, AD-5 ("Single validation point"), explicitly scopes itself to "the upload Route Handler's service call" — i.e., user-submitted images. Trend images in `public/trends.json` never pass through that route, so nothing in the spine enforces, or even documents, that curated trend images must already satisfy the YouCam Product Image spec. The Capability → Architecture Map's FR-01 row cites AD-4 (bytes-vs-metadata split) as governing FR-01, which is unrelated to this constraint. There is no rule anywhere stating "trend image URLs are passed to YouCam's `ref_file` param as-is, without server-side re-validation" — which is the architectural consequence of the PRD's requirement. A future implementer could reasonably (and wrongly) run trend images through AD-5's validation service, or skip enforcing the spec at curation time entirely, either of which breaks the PRD's stated intent.

**Suggest:** Either add a short rule (or extend AD-5) stating that curated trend images are asserted to already meet the YouCam Product Image spec at dataset-authoring time and are passed to `ref_file` without re-validation, or explicitly add this to the Deferred section alongside the existing "Curated JSON dataset sourcing" item so it isn't silently lost.

### 2. (Moderate) AD-6 drops the PRD's "logged-only, not user-facing" carve-out for `invalid_parameter`

PRD's VTO Error Handling table is explicit: `invalid_parameter` is "internal/logged only, not user-facing (indicates a bug, not a user-fixable issue)" — the one error code that should *not* reach the user.

AD-6 states: "Every YouCam error code maps to fixed copy in exactly one place... **The UI always renders that error inline on the same screen** (never a modal), with a retry action..." As written, this rule generalizes over *every* code, with no exception for the one code the PRD says must stay server-side/logged-only. This is a weakening of the PRD's error-handling contract — a literal reading of AD-6 would have `invalid_parameter` rendered inline to the user (exposing an internal/bug-indicating message), contradicting FR-06/NFR intent.

**Suggest:** Add a clause to AD-6 noting that the error-copy map's `invalid_parameter` entry is logged-only and never rendered to the user (e.g., falls back to a generic "something went wrong" inline message instead of code-specific copy), so the invariant matches the PRD's carve-out rather than contradicting it.

### 3. (Minor) Performance NFR's UX expectation-management during polling isn't acknowledged

PRD Performance NFR: "VTO requests must be handled via polling; the UI must manage user expectations during inference." The spine's AD-2 covers the polling *mechanism* (`GET /api/vto-tasks/[id]`) but nothing addresses the "manage user expectations" half (e.g., progress/loading state contract). This may legitimately belong to a UX spec rather than the architecture spine, but the spine doesn't note that deferral anywhere (unlike other PRD items it explicitly defers). Low risk, but worth an explicit one-line acknowledgment or Deferred entry so it isn't mistaken for an oversight.

### 4. (Minor) FR-01 → AD-4 binding is inconsistent between sections

The Capability → Architecture Map lists AD-4 as governing FR-01 ("image refs, not bytes"), but AD-4's own "Binds" line only lists FR-03 and FR-04 — FR-01 isn't in it. Since trend images are static curated JSON (never uploaded through the app), AD-4's "raw bytes vs. Cloudinary" rule doesn't actually apply the same way to FR-01 as it does to user uploads. This cross-reference mismatch is likely a symptom of Finding 1 (FR-01's real governing rule is missing) rather than a separate issue, but flagging it since it affects whether the Capability → Architecture Map can be read as "correct and complete."

### 5. (No issue — confirmed well-covered) Cost isolation and no-modal/retry contract

Spot-checked as strong matches, no action needed:
- Cost Management NFR (VTO cost isolated to registered users) is explicitly bound in AD-3 and enforced server-side, matching the PRD's rationale precisely.
- FR-06's "inline error, never a modal, plus a retry/'try another photo' action" is captured faithfully in AD-6.
- Both PRD Assumptions/Open Items are picked up: the curated-JSON-dataset assumption is explicitly named in the Deferred section; the two RESOLVED items (image constraints, failure fallback UI) are correctly treated as already-answered inputs rather than re-litigated.
- Security NFR (env-var-only secrets) is captured in Consistency Conventions.
- FR-02's "no API call, zero marginal cost" constraint is explicitly enforced by AD-3's rule that the manual overlay path never imports `lib/external/youcam.ts`.

---

## Capability → Architecture Map completeness check

All six FRs (FR-01 through FR-06) appear as rows and are bound in frontmatter. No FR is missing from the map. The only issues are the AD-4/FR-01 cross-reference mismatch (Finding 4) and the missing governing rule for FR-01's ref_file-reuse constraint (Finding 1) — the map's *shape* is complete, but one cell's justification doesn't fully hold up.
