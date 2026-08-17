---
stepsCompleted: [1, "requirements-confirmed", 2, "epics-approved", 3, "stories-generated"]
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-whattheheel-2026-08-10/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md'
---

# What the Heel - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for What the Heel, decomposing the requirements from the PRD, Architecture spine, and UX design contract (`DESIGN.md` + `EXPERIENCE.md` at `ux-designs/ux-whattheheel-2026-08-17/`) into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Trendsetter Feed — a dynamic gallery showing curated trends (JSON-backed). Curated shoe images must meet the YouCam Product Image spec (≥512x512, shoe >25% of frame height) so they're reusable as `ref_file` input for Journey 2 without reprocessing.
FR2: Anonymous Preview — manual client-side overlay. User drags/scales/rotates a shoe image onto their own foot photo via HTML5 Canvas or CSS transforms + pointer events. No ML model, no API call, fully offline/client-side — zero marginal cost per anonymous session.
FR3: User Registration/Profile — authentication flow to capture and store a user selfie.
FR4: AI VTO Integration — API integration with YouCam `/s2s/v2.0/task/shoes` endpoint.
FR5: Retail Integration — "Buy Now" links for recommended footwear.
FR6: VTO Failure Handling — on task failure, show an inline error on the same screen (not a modal) with copy tailored to the returned error code, plus a "try another photo" action that re-opens the upload control.

### NonFunctional Requirements

NFR1: Performance — VTO requests must be handled via polling; the UI must manage user expectations during inference.
NFR2: Security — API keys and sensitive credentials must be managed via environment variables (never `NEXT_PUBLIC_`-prefixed, per architecture AD-1).
NFR3: UX — the staged funnel must be seamless, minimizing friction while clearly communicating the value of registration.
NFR4: Image Constraints (YouCam AI Shoes API) — selfie: min 512x512, face >15% of image height, single subject, face fully visible, framing top-of-head to chest; shoe product image: min 512x512, shoe >25% of image height; shoe worn image: min 800x800, shoe >20% of image height, single item only. YouCam supports jpg/jpeg/png/heic inputs, all <10MB. For the MVP app-owned selfie upload boundary, accept jpg/jpeg/png only; direct HEIC/HEIF intake is deferred pending a patched Vercel-compatible server decoder and deployment-runtime proof.
NFR5: VTO Error Handling — each YouCam error code maps to specific inline copy: `error_no_face`, `error_download_image`, `error_inference`, `error_nsfw_content_detected`, `exceed_max_filesize` (all user-facing); `invalid_parameter` (logged server-side only, surfaced to the user as generic `error_inference` copy per architecture AD-6).
NFR6: Cost Management — each AI Shoes VTO call consumes 2 YouCam units; VTO calls are restricted to registered users only (anonymous tier stays fully client-side) to protect the free-tier budget.

### Additional Requirements

- **No code exists yet** — the project has not been scaffolded. Epic 1 Story 1 must initialize Next.js (verify latest 16.x patch at scaffold time — spine pins 16.0.3 but flags it as already a few minors behind) + TypeScript 5 + Tailwind CSS 4 + ESLint 9, with `"engines": { "node": "24.x" }` pinned in `package.json`.
- Layered paradigm (Route Handlers → Services → Data/External, one-way dependency) must be scaffolded as the base directory structure (`app/api/*`, `lib/services/*`, `lib/data/*`, `lib/external/*`) before feature stories build on it.
- MongoDB Atlas M0 cluster provisioning + connection setup (separate `whattheheel_dev`/`whattheheel_prod` databases), `mongodb` npm driver 7.5.0, with `serverExternalPackages: ['mongodb']` configured in `next.config` to avoid Server Component bundling errors.
- Cloudinary account/API setup (SDK 2.10.0) for selfie + shoe "worn" image storage — raw image bytes never go into MongoDB (architecture AD-4).
- NextAuth v4.24.15 with `CredentialsProvider` (email + password) and `session: { strategy: 'jwt' }` — no database adapter; `bcryptjs` 3.0.3 for password hashing. The `users` collection is app-owned via `lib/data/users.ts`; app-specific profile fields (`selfieUrl`) go in a separate `user_profiles` collection (architecture AD-7, Consistency Conventions).
- YouCam AI Shoes API integration (`/s2s/v2.0/task/shoes`) requires a Perfect Corp API key (Bearer auth), server-side only, task creation + polling via a single `vtoTask.ts` service and one `vto_tasks` collection (architecture AD-1, AD-2, AD-3).
- Every API route must use the two fixed response envelopes: success `{ data: <payload> }`, failure `{ error: { code, message } }` (architecture Consistency Conventions).
- Deployment to Vercel (git-push deploy); environment variables configured per-environment in Vercel Project Settings + local `.env.local`.
- Testing convention: Jest + React Testing Library, co-located `__tests__`, `.test.tsx` naming, render-smoke test minimum for every new component (per `project-context.md`).

**Known non-blocking gaps (architecture Deferred list — not required for this pass unless promoted):** retail link source (static JSON field vs. live API), rate limiting on `/api/vto-tasks`, CI/CD pipeline specifics, curated trend dataset spec conformance (manual curation, unchecked at runtime), dev-environment YouCam billing exposure (no mock mode). (NextAuth session strategy and polling UX copy are now resolved — see architecture AD-7 and `EXPERIENCE.md`'s Component Patterns, respectively.)

### UX Design Requirements

A full UX design contract exists at `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/` (`DESIGN.md` + `EXPERIENCE.md`, produced after this epic/story breakdown — see `epics.md`'s `inputDocuments` frontmatter). Visual identity: Bold Streetwear direction (dark-mode-only, neon-on-ink palette). Key UX decisions load-bearing for these stories: no style picker (Story 2.3), file-upload-only photo capture (Stories 1.3/2.2), bottom-tab navigation, and a concrete VTO polling UX (2s interval, progress bar, rotating status copy, 30s "still working" fallback) that fills in what NFR1 left unspecified.

### FR Coverage Map

FR1: Epic 1 - Trendsetter Feed (curated gallery)
FR2: Epic 1 - Anonymous manual overlay preview
FR3: Epic 2 - Registration/profile with selfie capture
FR4: Epic 2 - YouCam AI VTO integration
FR5: Epic 2 - Retail "Buy Now" links
FR6: Epic 2 - VTO failure handling

## Epic List

### Epic 1: Trend Discovery & Instant Styling Preview

Anonymous visitors can browse a curated feed of trending shoes and get an instant, no-signup styling preview by manually overlaying a shoe onto their own foot photo — delivering immediate aesthetic value and zero friction, ahead of any registration ask. This epic also carries the one-time technical foundation (Next.js app scaffolding, layered directory structure) since nothing has been built yet — folded into Story 1.1 rather than a separate technical epic.

**FRs covered:** FR1, FR2

### Epic 2: Registered AI Stylist & Virtual Try-On

Registered users can capture a selfie, run high-fidelity AI virtual try-on via the YouCam API against a trend selected from Epic 1's feed, recover gracefully from any failure with clear inline guidance, and reach "Buy Now" retail links for the shoe — the premium, judge-facing centerpiece of the product. Builds on Epic 1 (reuses the trend feed and selection) but Epic 1 stands alone without it.

**FRs covered:** FR3, FR4, FR5, FR6

## Epic 1: Trend Discovery & Instant Styling Preview

Anonymous visitors can browse a curated feed of trending shoes and get an instant, no-signup styling preview by manually overlaying a shoe onto their own foot photo — delivering immediate aesthetic value and zero friction, ahead of any registration ask.

### Story 1.1: Project Scaffolding & Foundation

As a developer,
I want the Next.js project scaffolded with the pinned stack and the layered directory structure,
So that feature stories have a working, architecturally-compliant foundation to build on.

**Acceptance Criteria:**

**Given** no project exists yet
**When** `create-next-app` is run with TypeScript, Tailwind, ESLint, and App Router flags
**Then** a working Next.js app is created on the latest 16.x patch available at scaffold time (spine flags 16.0.3 as already a few minors stale)

**Given** the scaffolded app
**When** `package.json` is inspected
**Then** `"engines": { "node": "24.x" }` is present

**Given** the architecture spine's layered paradigm
**When** the base directories are created
**Then** `app/api/`, `lib/services/`, `lib/data/`, `lib/external/`, and `public/` exist, establishing the one-way dependency boundary

**Given** the scaffolded app
**When** `npm run dev` runs
**Then** the app renders without errors

**And** Jest + React Testing Library are configured per `project-context.md` (co-located `__tests__`, `.test.tsx` naming)

### Story 1.2: Curated Trendsetter Feed Display

As an anonymous visitor,
I want to browse a curated gallery of trending shoes,
So that I can discover styles before committing to registration.

**Acceptance Criteria:**

**Given** the app is running
**When** I visit the trend feed page
**Then** I see a gallery sourced from `public/trends.json` (not a Mongo collection, per architecture)

**Given** a trend entry
**When** rendered
**Then** it displays the shoe image and label, and its data includes an `id`, `shoeImageUrl`, and `buyUrl` field (buyUrl wired to UI in Epic 2/FR5, but present in the schema now to avoid re-touching this file later)

**Given** the curated dataset
**When** images are added
**Then** each `shoeImageUrl` meets the YouCam Product Image spec (≥512x512, shoe >25% of frame) — curator-verified, not runtime-checked (architecture Deferred item)

**And** the feed layout is responsive (NFR3 — seamless UX)

### Story 1.3: Anonymous Manual Overlay Preview

As an anonymous visitor,
I want to drag, scale, and rotate a selected trend's shoe image onto my own foot photo,
So that I get an instant, no-signup styling preview.

**Acceptance Criteria:**

**Given** I select a trend from the feed
**When** I choose my own foot photo
**Then** the overlay component renders both images client-side (no upload)

**Given** the overlay is showing
**When** I drag the shoe image
**Then** its position updates in real time

**Given** the overlay is showing
**When** I use scale/rotate controls
**Then** the shoe image resizes and rotates accordingly

**Given** this is the anonymous path
**When** any of the above happens
**Then** no network request is made to YouCam, Cloudinary, or MongoDB (AD-1/AD-3 compliance — purely client-side, zero marginal cost)

**And** a CTA inviting registration to unlock the full AI Stylist is shown after interacting with the preview (PRD Journey 1, step 4)

## Epic 2: Registered AI Stylist & Virtual Try-On

Registered users can capture a selfie, run high-fidelity AI virtual try-on via the YouCam API against a trend selected from Epic 1's feed, recover gracefully from any failure with clear inline guidance, and reach "Buy Now" retail links for the shoe.

### Story 2.1: User Registration & Login

As a visitor,
I want to register and log in with an account,
So that I can access the premium AI Stylist experience.

**Acceptance Criteria:**

**Given** I am anonymous
**When** I click the "unlock AI Stylist" CTA
**Then** I am prompted to register/sign in with email + password via NextAuth's `CredentialsProvider` (no OAuth, no adapter — AD-7)

**Given** valid registration
**When** I complete it
**Then** `POST /api/auth/register` hashes my password with `bcryptjs` and creates a `users` document via `lib/data/users.ts` (`id`, `email`, `passwordHash`, `createdAt`) — written only by this route, read only inside `authorize()`

**Given** I successfully log in
**When** I navigate the app
**Then** my session is available server-side via NextAuth's session helper, using `session: { strategy: 'jwt' }` (required by CredentialsProvider — database sessions are incompatible)

**And** no NextAuth database adapter is installed; `bcryptjs` is used for hashing and password comparison, and MongoDB connects to the correct dev/prod Atlas database names

### Story 2.2: Selfie Capture & Profile Storage

As a registered user,
I want to upload a selfie for digital fitting,
So that the AI Stylist can generate a personalized visualization.

**Acceptance Criteria:**

**Given** I am logged in
**When** I upload a selfie
**Then** it is validated server-side before any Cloudinary or database side effect: decoded format must be JPG/JPEG or PNG, size must be strictly under 10MB, and effective dimensions must be at least 512x512 (AD-5, single validation point)

**And** HEIC/HEIF is rejected with clear inline guidance in this release, with zero Cloudinary uploads and zero profile writes

**Given** a valid selfie
**When** validation passes
**Then** it's uploaded to Cloudinary (never stored as bytes in MongoDB, AD-4) and the resulting URL is saved to a `user_profiles` document keyed by my `userId` — not the `users` collection (which holds auth-core fields only, AD-7)

**Given** an invalid selfie (wrong format/too large/wrong dimensions)
**When** I submit it
**Then** I see a clear inline validation error before any Cloudinary upload occurs

**And** this story creates only the `user_profiles` collection — not `vto_tasks` (entities created only when needed)

### Story 2.3: AI Virtual Try-On Generation

As a registered user with a saved selfie,
I want to trigger AI virtual try-on for a selected trend,
So that I can see the shoe visualized on myself.

**Acceptance Criteria:**

**Given** I'm logged in with a saved selfie
**When** I select a trend and trigger VTO
**Then** `POST /api/vto-tasks` creates a task via `lib/services/vtoTask.ts`, requiring an authenticated session (AD-3)

**Given** a task is created
**When** YouCam returns a `task_id`
**Then** it's stored in a new `vto_tasks` document with `userId`, `status`, and the src/ref Cloudinary URLs

**Given** a pending task
**When** the client polls `GET /api/vto-tasks/[id]`
**Then** it receives status updates until `success` or `error`, scoped so only the owning user's session can read it (404 on mismatch, AD-3)

**Given** a successful task
**When** status becomes `success`
**Then** the high-fidelity VTO image is displayed

**And** all YouCam/Cloudinary calls happen server-side only, Node.js runtime, never in a Client Component (AD-1)

### Story 2.4: VTO Failure Handling

As a registered user,
I want clear guidance when my AI Stylist request fails,
So that I understand what went wrong and can retry without frustration.

**Acceptance Criteria:**

**Given** a VTO task returns an error code
**When** the client polls and sees `status: error`
**Then** an inline message (not a modal) appears using the fixed copy map for that code (AD-6/NFR5)

**Given** the error is `error_no_face`
**When** shown
**Then** the copy reads "We couldn't detect a face — try a front-facing selfie with good lighting."

**Given** the error is `invalid_parameter`
**When** shown
**Then** the user sees the generic `error_inference` copy while the actual code is logged server-side only

**Given** any user-facing error
**When** displayed
**Then** a "try another photo" action re-opens the upload control from Story 2.2

**And** this story only adds the error-copy map and inline UI — no new collections

### Story 2.5: Retail Buy Now Links

As a registered user viewing my VTO result,
I want a "Buy Now" link for the shoe,
So that I can purchase it directly.

**Acceptance Criteria:**

**Given** a successful VTO result is displayed
**When** rendered
**Then** a "Buy Now" link appears using the trend's `buyUrl` field (already present from Story 1.2)

**Given** the buyUrl
**When** clicked
**Then** it opens in a new tab to the retail destination

**Given** a trend with no `buyUrl` set
**When** rendered
**Then** the Buy Now button is hidden rather than showing a broken link

**And** no new backend work is needed — UI-only, reusing existing trend data

### Story 2.6: VTO Result History

> Added 2026-08-17, post-launch — not part of the original PRD FR list. Prioritized ahead of Stories 2.4/2.5 as a faster, higher-impact demo addition once Story 2.3's core VTO loop was live.

As a registered user,
I want to see my past AI try-on results on my profile,
So that I can revisit looks I've already generated without re-running them.

**Acceptance Criteria:**

**Given** a VTO task transitions to `success`
**When** its result is persisted
**Then** the result image is downloaded from YouCam and re-uploaded to this app's own Cloudinary storage (same authenticated/private pattern as selfies, architecture AD-4) — YouCam retains processed results for only ~24 hours (confirmed in `docs/ai-skin-analysis.md`), so the raw YouCam result URL is never the one stored or served past that transition (architecture AD-8)

**Given** a registered user with at least one successful VTO result
**When** they view their Profile screen
**Then** a "Past Try-Ons" grid section shows each result's image and its trend's label, most recent first

**Given** a registered user with zero successful VTO results
**When** they view Profile
**Then** no history section renders at all — not an empty-state placeholder

**Given** the history grid
**When** rendered
**Then** it is view-only — no delete/remove action and no re-trigger/detail interaction (both explicitly deferred; this story is scoped to display only)
