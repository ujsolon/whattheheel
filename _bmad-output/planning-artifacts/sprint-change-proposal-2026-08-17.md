# Sprint Change Proposal — US2.2 Selfie Format Scope

**Date:** 2026-08-17  
**Status:** Approved and applied  
**Change classification:** Moderate artifact correction; low implementation effort

## 1. Issue Summary

US2.2 currently requires authoritative server-side validation of JPEG, PNG, and HEIC selfies before any Cloudinary upload. During implementation, deployment-runtime testing established that the standard Sharp/Vercel Node runtime cannot decode common HEVC-backed HEIC files without a custom libvips/libheif build.

Two JavaScript alternatives were evaluated and rejected:

- The older Node-compatible libheif-js line is affected by CVE-2026-32814.
- The maintained `heic-to@1.5.2` line uses a patched libheif but requires browser Worker APIs and fails at the authoritative Node validation boundary.

Because AD-5 requires validation before Cloudinary, accepting HEIC without a proven decoder would either bypass the security boundary or falsely claim support. The approved product direction is therefore to ship US2.2 with server-validated JPG/JPEG and PNG intake, and defer direct HEIC/HEIF selfie intake.

## 2. Impact Analysis

### Epic and story impact

- Epic 2 remains viable and keeps its current sequence.
- US2.2 changes its app-owned selfie intake contract from JPG/JPEG/PNG/HEIC to JPG/JPEG/PNG.
- US2.3 and US2.4 are not blocked: they consume the saved Cloudinary selfie produced by US2.2, which remains available as JPEG or PNG.
- YouCam's documented ability to accept HEIC inputs remains recorded; the scope reduction applies only to the app-owned US2.2 upload and validation boundary.
- No new collection, service topology, epic, or immediate numbered story is required. Direct HEIC intake remains in the deferred-work register until its restoration conditions are met.

### Artifact impact

- **PRD:** distinguish YouCam-supported formats from the MVP selfie-upload formats and record the HEIC intake exception.
- **Epics:** refine NFR4 and Story 2.2 acceptance criteria so the implementable MVP contract is explicit.
- **Architecture:** add the codec constraint under AD-5/deferred decisions without changing layer boundaries.
- **UX Experience:** narrow the selfie picker and guidance to JPG/PNG while leaving the anonymous foot-photo picker behavior unchanged.
- **UX Design:** no visual-token or layout change.
- **US2.2 story:** replace HEIC success requirements with explicit rejection-before-side-effects coverage and update implementation/runtime notes.
- **Deferred work:** retain the already-recorded HEIC item, including user impact, security rationale, and restoration criteria.

### Technical and operational impact

- No HEIC bytes reach Cloudinary or MongoDB because server validation rejects them first.
- JPEG/JPG and PNG upload, validation, private Cloudinary storage, profile persistence, replacement, and later VTO remain available.
- Users whose devices produce only HEIC must export or convert the image to JPEG/PNG before upload.
- Schedule impact is low; this removes an unsafe runtime dependency path and reduces implementation uncertainty.

## 3. Recommended Path

Use a hybrid of direct adjustment and explicit MVP scope reduction:

1. Correct the current US2.2 implementation and tests to accept only decoded JPEG/JPG and PNG.
2. Align PRD, epics, architecture, UX, and the story record so no artifact continues to promise direct HEIC upload in this release.
3. Keep YouCam's broader input-format capability documented separately.
4. Restore direct HEIC/HEIF intake only when either:
   - a patched, Vercel-compatible server decoder is available and passes a genuine HEVC fixture in the deployment runtime; or
   - a separate image-processing service is explicitly approved, with privacy, cost, and failure behavior reviewed.

Rollback is not recommended because the current JPEG/PNG path is sound and later Epic 2 stories do not depend on HEIC specifically.

## 4. Detailed Change Proposals

### 4.1 PRD — Image Constraints

**Current:**

> Selfie: min 512x512, face >15% of image height, single subject, face fully visible, framing top-of-head to chest (half-body to waist optimal). jpg/jpeg/png/heic, <10MB.

**Proposed:**

> Selfie: min 512x512, face >15% of image height, single subject, face fully visible, framing top-of-head to chest (half-body to waist optimal), <10MB. The YouCam API supports jpg/jpeg/png/heic; the MVP app-owned selfie upload accepts jpg/jpeg/png only. Direct HEIC/HEIF intake is deferred, and users must export or convert HEIC photos before upload.

Keep both shoe-image constraint rows unchanged. Add an explicit deferred/open-item note referencing the deployment-safe decoder requirement.

### 4.2 Epics — NFR4 and Story 2.2

**NFR4 current ending:**

> All jpg/jpeg/png/heic, <10MB.

**NFR4 proposed ending:**

> YouCam supports jpg/jpeg/png/heic inputs, all <10MB. For the MVP app-owned selfie upload boundary, accept jpg/jpeg/png only; direct HEIC/HEIF intake is deferred pending a patched Vercel-compatible server decoder and deployment-runtime proof.

**Story 2.2 validation AC current:**

> Then it's validated server-side (format/size/dimensions, NFR4) before anything else happens.

**Proposed:**

> Then it is validated server-side before any Cloudinary or database side effect: decoded format must be JPG/JPEG or PNG, size must be strictly under 10MB, and effective dimensions must be at least 512×512. HEIC/HEIF is rejected with clear inline guidance in this release.

Add explicit acceptance coverage that rejected HEIC/HEIF causes zero Cloudinary uploads and zero profile writes.

### 4.3 Architecture — AD-5 / Deferred Decisions

Add this implementation constraint without changing the architectural boundary:

> The Story 2.2 authoritative upload validator currently accepts decoded JPEG and PNG only. HEIC/HEIF must be rejected before external or data-layer side effects because the standard Vercel/Sharp runtime does not provide a proven HEVC decoder. This is an MVP codec constraint, not a change to YouCam's downstream format capability.

Add the same restoration gate used in deferred work. No route, repository, collection, or dependency-direction changes are proposed.

### 4.4 UX Experience — Upload Control and Guidance

Split the shared upload-control rule:

- Selfie upload: `<input type="file" accept="image/jpeg,image/png">`, with authoritative server validation and guidance: `Use a clear, front-facing solo photo from the top of your head to your chest. JPG or PNG; at least 512 × 512px; under 10MB.`
- Wrong-format copy: `Use a JPG or PNG image.`
- Anonymous foot-photo picker: retain its existing broad browser image picker behavior because it is client-only and decoded by the browser.

No DESIGN.md token, layout, or component-appearance change is required.

### 4.5 US2.2 Implementation Story

Apply these story-record substitutions:

- Change normalized valid formats from `jpeg | png | heif` to `jpeg | png`.
- Replace the real-HEIC success fixture/runtime requirement with a genuine HEIC rejection test proving no Cloudinary or database side effects.
- Change the selfie input `accept` value to `image/jpeg,image/png`.
- Change all supported-format guidance and validation copy from `JPG, PNG, or HEIC` to `JPG or PNG`.
- Change live verification from valid JPG/PNG/HEIC upload to valid JPG/PNG upload plus HEIC rejection.
- Record the approved course correction and link the deferred-work entry.
- Keep the story `in-progress` and resume `$bmad-dev-story` after these artifact edits.

## 5. Delivery and Handoff

- **Scope classification:** Moderate because multiple planning artifacts change, despite low code effort.
- **Primary handoff:** Product owner approves the MVP format reduction; development resumes US2.2 implementation.
- **Success criteria:** all authoritative specs agree on JPG/JPEG/PNG intake; HEIC is rejected before side effects; existing JPEG/PNG/profile behavior remains green; deferred restoration conditions are discoverable.
- **No change:** Epic 2 sequence, MongoDB/Cloudinary design, private-media policy, US2.3/2.4 functionality, or deployment topology.

## 6. Approval

Approval authorizes the edits above to the PRD, epics, architecture, UX Experience, US2.2 story record, and any wording alignment needed in the existing deferred-work entry. It does not authorize adding an external image-processing service or custom native deployment runtime.

**Decision:** Approved by the product owner on 2026-08-17; artifact corrections applied.
