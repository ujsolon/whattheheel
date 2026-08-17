---
title: 'What the Heel: The AI Shoe Stylist'
status: 'final'
created: '2026-08-10'
updated: '2026-08-17'
---

# PRD: What the Heel - The AI Shoe Stylist

## 1. Overview
"What the Heel" is an AI-powered shoe styling platform designed to enhance online footwear shopping. It solves the problem of visual uncertainty by leveraging AR Virtual Try-On (VTO) technology, allowing users to visualize trending footwear on their own body. The platform provides a staged UX funnel: anonymous trend discovery with basic previews, and premium, high-fidelity AI-powered VTO upon user registration.

## 2. Product Goals
- **Hackathon Impact:** Deliver a high-value, novel, and cohesive hackathon entry that demonstrates clear consumer/retail value and strong technical implementation using the Perfect Corp. YouCam API.
- **Conversion Funnel:** Successfully convert anonymous users to registered users by providing immediate aesthetic value via the "Trendsetter Feed".
- **User Confidence:** Increase purchase confidence by visualizing footwear on the user, addressing the visual-fit dilemma.

## 3. User Journeys
### Journey 1: Trend Discovery (Anonymous)
1. User lands on the curated 'Trendsetter' feed.
2. User browses trending celebrity/runway footwear.
3. User selects a shoe and performs an instant client-side aesthetic preview using their foot photo.
4. User is presented with a CTA to unlock the AI Stylist for full high-fidelity visualization.

### Journey 2: Premium AI-Stylist (Registered)
1. User completes registration and uploads a selfie (head-to-chest) for digital fitting.
2. User selects a trend from the feed.
3. User triggers the YouCam AI Shoes API for high-fidelity VTO.
4. User visualizes the shoe in a selected style context and gets actionable retail links.

## 4. Functional Requirements
- [FR-01] Trendsetter Feed: A dynamic gallery showing curated trends (JSON-backed). Curated shoe images must meet the YouCam Product Image spec (≥512x512, shoe >25% of frame height) so they're reusable as `ref_file` input for Journey 2 without reprocessing.
- [FR-02] Anonymous Preview: Manual client-side overlay. User drags/scales/rotates a shoe image onto their own foot photo via HTML5 Canvas or CSS transforms + pointer events. No ML model, no API call, fully offline/client-side — zero marginal cost per anonymous session.
- [FR-03] User Registration/Profile: Authentication flow to capture and store user selfie.
- [FR-04] AI VTO Integration: API integration with YouCam `/s2s/v2.0/task/shoes` endpoint.
- [FR-05] Retail Integration: "Buy Now" links for recommended footwear.
- [FR-06] VTO Failure Handling: On task failure, show an inline error on the same screen (not a modal) with copy tailored to the returned error code, plus a "try another photo" action that re-opens the upload control. See error-code mapping in Non-Functional Requirements.

## 5. Non-Functional Requirements
- **Performance:** VTO requests must be handled via polling; the UI must manage user expectations during inference.
- **Security:** API keys and sensitive credentials must be managed via environment variables.
- **UX:** The staged funnel must be seamless, minimizing friction while clearly communicating the value of registration.
- **Image Constraints (YouCam AI Shoes API):**
  - Selfie: min 512x512, face >15% of image height, single subject, face fully visible, framing top-of-head to chest (half-body to waist optimal), <10MB. The YouCam API supports jpg/jpeg/png/heic; the MVP app-owned selfie upload accepts jpg/jpeg/png only. Direct HEIC/HEIF intake is deferred, and users must export or convert HEIC photos before upload.
  - Shoes (Product Image): min 512x512, shoe >25% of image height. jpg/jpeg/png/heic, <10MB.
  - Shoes (Worn Image): min 800x800, shoe >20% of image height, single item only. jpg/jpeg/png/heic, <10MB.
- **VTO Error Handling (FR-06):** Each API error code maps to specific inline copy:
  - `error_no_face`: "We couldn't detect a face — try a front-facing selfie with good lighting."
  - `error_download_image`: "We couldn't load one of the images — please try uploading again."
  - `error_inference`: "Something went wrong generating your preview — please try again."
  - `error_nsfw_content_detected`: "This image can't be used — please choose a different photo."
  - `exceed_max_filesize`: "That image is too large (max 10MB) — please choose a smaller file."
  - `invalid_parameter`: internal/logged only, not user-facing (indicates a bug, not a user-fixable issue).
- **Cost Management:** Each AI Shoes VTO call consumes 2 units against the YouCam plan (free tier has no credit-card-required starter units; paid tiers ~$0.048–0.055/unit). Because FR-02's anonymous preview is fully client-side, VTO unit consumption is isolated to registered users only — this bounds API cost to the conversion funnel and protects the free-tier budget for the hackathon demo.

## 6. Assumptions & Open Items
- [ASSUMPTION] Curated JSON dataset will be sufficient to populate the trend feed for the hackathon prototype.
- [ASSUMPTION] The manual client-side overlay (FR-02) provides enough perceived value to drive registration, now reinforced by cost logic (real VTO costs units; the anon tier must stay free to protect budget) not just UX logic.
- [RESOLVED] YouCam shoe/selfie image format requirements — see Non-Functional Requirements > Image Constraints, sourced from `docs/perfectcorp-api-reference.md`.
- [DEFERRED] Direct HEIC/HEIF intake at the app-owned selfie-upload boundary — restore only with a patched, Vercel-compatible server decoder or an approved image-processing service, plus a genuine HEVC fixture and deployment-runtime proof. This does not change YouCam's downstream HEIC capability.
- [RESOLVED] VTO failure fallback UI — see FR-06 and Non-Functional Requirements > VTO Error Handling.
