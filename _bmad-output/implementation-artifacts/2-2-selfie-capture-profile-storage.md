---
baseline_commit: d8d75bcd813b35d1c22acd95ae1c1e8515d9c74f
---

# Story 2.2: Selfie Capture & Profile Storage

Status: review

## Story

As a registered user,
I want to upload a selfie for digital fitting,
so that the AI Stylist can generate a personalized visualization.

## Acceptance Criteria

1. **Given** I am not authenticated, **when** I visit `/profile` or submit `POST /api/upload`, **then** I am redirected to `/register` with a validated same-origin return target or receive a `401` error envelope at the API boundary; after authentication I return to `/profile`, and no client-supplied email or `userId` is trusted.
2. **Given** I am logged in, **when** Profile loads, **then** I see my account email and either my saved selfie with an Add/change photo action or a `No selfie yet` prompt with the same native file-upload flow.
3. **Given** I choose a selfie, **when** I submit it, **then** the server accepts only decoded JPG/JPEG or PNG, validates the strict `<10MB` byte size and orientation-aware minimum `512x512` dimensions, and rejects HEIC/HEIF before any Cloudinary call or profile write (AD-5).
4. **Given** a supported valid selfie, **when** validation passes, **then** the server uploads it with Cloudinary delivery type `authenticated` and writes one `user_profiles` record keyed by the authenticated session's string `userId`; MongoDB stores only asset references and image metadata, never image bytes, while UI/API responses expose only a five-minute `private_download_url` generated server-side for that authenticated asset (AD-4/AD-7).
5. **Given** an unsupported, corrupt, exactly-10MB-or-larger, or undersized image, **when** I submit it, **then** I stay on the same screen and receive one clear inline `role="alert"` message; Cloudinary and Mongo profile writes are not called.
6. **Given** an upload is pending, **when** I try to submit or change modes again, **then** the file control and submit action remain disabled and the action reads `Uploading…`, preventing duplicate uploads.
7. **Given** a selfie is saved, **when** the request succeeds, **then** Profile shows `Selfie saved.` and the new descriptive thumbnail; concurrent replacements use compare-and-swap semantics so stale requests cannot overwrite a newer selfie, and superseded asset IDs remain durably recorded in that profile until authenticated Cloudinary deletion succeeds.
8. **Given** the image is mechanically valid, **when** it is accepted, **then** the UI has already explained the downstream photo guidance: one clear front-facing subject, face fully visible and over 15% of image height, framed top-of-head to chest. Semantic face/count/framing enforcement is owned by YouCam in Stories 2.3/2.4, not falsely claimed by this metadata validator.
9. **Given** the architecture boundaries, **when** this story is implemented, **then** the Route Handler remains HTTP-only, orchestration and auth live in services, MongoDB is imported only by `lib/data/*`, Cloudinary only by `lib/external/*`, and no `vto_tasks` collection or YouCam call is introduced.
10. **Given** any viewport or assistive technology, **when** I use Profile/upload, **then** content stays centered and capped near 480px, controls have associated labels, semantic buttons/links, 44px targets, the shared 3px lime focus treatment, sentence-case instructional/error copy, and no modal or custom camera UI.

## Tasks / Subtasks

- [x] Make authenticated identity usable outside registration (AC: 1, 2, 4)
  - [x] Update `lib/services/auth.ts` with JWT/session callbacks that propagate the credentials user's persistent `id` through token `sub` to `session.user.id`; preserve CredentialsProvider, JWT sessions, dummy-hash timing protection, and all US2.1 error behavior.
  - [x] Add `types/next-auth.d.ts` module augmentation for `Session.user.id`; never key profiles by email or a request field.
  - [x] Promote the existing `SessionProvider` from the `/register` subtree to one shared root provider only if client session APIs are used by Profile; remove the narrower duplicate and regression-test registration. Server authorization still uses `getServerSession(authOptions)`.
  - [x] Add one reusable `requireAuthenticatedUser()` service helper used inside profile read/write services, returning the server-derived `{ id, email }` principal or a typed unauthorized error. Pages/routes must not establish a weaker parallel ownership check.
  - [x] Update `app/components/AuthForm.tsx` and the preview registration CTA to carry a validated relative `callbackUrl`: new registration defaults to `/profile`, protected-page sign-in returns to the requested local path, and arbitrary/external/protocol-relative targets fall back safely to `/`. Preserve an optional `trend` query through `/register` and `/profile` for Story 2.3; never create an open redirect.

- [x] Add pinned image-storage dependencies and configuration (AC: 3, 4, 9)
  - [x] Install direct runtime dependencies `cloudinary@2.10.0` and `sharp@0.35.3` (both current as of story creation; Sharp is currently only transitive and must not be relied on implicitly). Do not add `@types/sharp` because Sharp ships types.
  - [x] Extend `.env.example` with placeholder-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; never expose them through `NEXT_PUBLIC_*` or logs.
  - [x] Keep the upload route on Node.js (`export const runtime = "nodejs"`) and verify Sharp JPEG/PNG decoding in the deployment-compatible build runtime.

- [x] Implement authoritative image validation (AC: 3, 5, 8)
  - [x] Add `lib/services/imageValidation.ts` accepting a `File`/buffer-like plain input and returning `ValidatedImage`. Inspect bytes via Sharp rather than filename/browser MIME; allow only normalized `jpeg | png`, reject HEIC/HEIF, animated/multi-page and unsupported formats, corrupt/truncated data, `size >= 10_000_000` bytes, and decoded images above a bounded pixel ceiling (40MP) to prevent decompression abuse.
  - [x] Apply EXIF orientation when interpreting width/height, requiring both effective dimensions to be at least 512px. Keep stable service errors/copy for missing file, format, size, dimensions, and unreadable content.
  - [x] Force a complete, bounded pixel decode (not metadata-only parsing) before validation succeeds. Treat Sharp metadata as format/dimension discovery and the full decode as corruption/decompression verification.
  - [x] Include real JPEG and PNG success fixtures plus a genuine HEVC-backed HEIC rejection fixture. Prove HEIC rejection occurs before any Cloudinary or database side effect; restoration is tracked in `deferred-work.md`.
  - [x] Do not add face-detection packages. Surface the face/solo/framing requirements as proactive guidance; later YouCam `error_no_face` handling owns semantic rejection.

- [x] Add Cloudinary and profile persistence boundaries (AC: 4, 7, 9)
  - [x] Add `lib/external/cloudinary.ts`, configure `cloudinary.v2` from server-only env vars, and expose narrow upload/delete/private-download functions. Upload opaque generated public IDs (no email/user ID), `resource_type: "image"`, `type: "authenticated"`, `overwrite: false`, and an app folder; delete with invalidation. Generate browser/YouCam access only via `cloudinary.utils.private_download_url(publicId, format, { resource_type: "image", type: "authenticated", expires_at: now + 300 })`; a normal signed transformation URL is not time-expiring and does not satisfy this contract.
  - [x] Add `lib/data/userProfiles.ts` with repository-only `UserProfileDocument { userId, selfieUrl, selfiePublicId, assetVersion, width, height, format, bytes, pendingCleanupPublicIds, createdAt, updatedAt }`, where stored `selfieUrl` is Cloudinary's authenticated-delivery `secure_url`, not a public response DTO. Use `getDb()`, a cached/retryable unique index on `userId`, string user IDs, and no bytes. Define a separate public `ProfileView { email, selfieUrl, updatedAt }`, whose `selfieUrl` is freshly signed and expiring; never serialize the repository document/public ID.
  - [x] Implement replacement with `findOneAndUpdate` compare-and-swap against the exact prior `selfiePublicId`/version (or equivalent), preserving `createdAt` and returning the displaced document. On a conflict, always return `409 profile_conflict` and attempt bounded compensating deletion of the losing new asset; never let an older request overwrite a newer result.
  - [x] Add `lib/services/profile.ts` for authenticated reads and upload orchestration: validate -> upload new asset -> conditional profile replacement -> cleanup. Atomically append the displaced public ID to `pendingCleanupPublicIds`, remove IDs only after deletion succeeds, and retry pending cleanup on later profile reads/uploads. If the DB write fails/conflicts, retry compensating deletion of the new asset with bounded backoff. Log only operation/error class/correlation ID—never media identifiers, URLs, bodies, or secrets.

- [x] Add the authenticated upload boundary (AC: 1, 3-5, 9)
  - [x] Add `app/api/upload/route.ts` as a thin multipart `POST`. Read `request.body` through a hard byte-counting cap (multipart limit = 10,100,000 bytes, separate from the strict 10,000,000-byte file limit) before parsing the bounded bytes as `FormData`; do not rely on `Content-Length`, which may be absent, false, or chunked. Require exactly one `File` under `selfie`, reject duplicate/unexpected file fields, then call the self-authenticating profile service.
  - [x] Lock the HTTP contract: `200` success `{data:{profile: ProfileView}}`; `401 unauthorized`; `400 missing_file|invalid_multipart|unsupported_format|unreadable_image|image_too_small`; `413 payload_too_large|file_too_large`; `409 profile_conflict`; `500 selfie_storage_failed`. Every failure uses `{error:{code,message}}`; internal errors never reach copy.
  - [x] Ensure every invalid/auth failure test asserts zero Cloudinary and profile writes. Do not create GET upload APIs, VTO routes, or `vto_tasks`.

- [x] Build the Profile and selfie-upload experience (AC: 2, 5-8, 10)
  - [x] Add `app/profile/page.tsx` as a personalized, dynamically rendered authenticated Server Component that loads `ProfileView` through the service and redirects anonymous visitors to `/register?callbackUrl=/profile`; prevent cross-user caching. Distinguish no profile from a safe generic storage-failure state.
  - [x] Add `app/components/SelfieUploadForm.tsx` as the single reusable Client Component for initial upload, replacement, and Story 2.4's future retry hook. Use native `<input type="file" accept="image/jpeg,image/png">`; show filename/local thumbnail only as a preview, submit multipart to `/api/upload`, and revoke any object URL on replacement/unmount.
  - [x] Render exact pending/success copy `Uploading…` / `Selfie saved.`. Use these validation messages: `Choose a selfie to upload.`, `Use a JPG or PNG image.`, `That image is too large (max 10MB) — please choose a smaller file.`, `Use an image that is at least 512 × 512 pixels.`, `We couldn't read that image — please choose a different file.`, and generic `We couldn't save your selfie — please try again.`
  - [x] Add the proactive instruction: `Use a clear, front-facing solo photo from the top of your head to your chest. JPG or PNG; at least 512 × 512px; under 10MB.`
  - [x] Update `app/components/AppNavigation.tsx` so Profile is a real link/current surface while AI Stylist remains unavailable until Story 2.3. Preserve Feed/Preview behavior and mobile-bottom/desktop-top layout.
  - [x] Add the Profile sign-out control required by the UX contract; it clears the session and returns to `/` without a confirmation modal.
  - [x] Render authenticated Cloudinary media with a short-lived signed URL. If using `next/image`, add only the exact Cloudinary delivery host to `next.config.ts`; never wildcard arbitrary image hosts.
  - [x] Apply the existing upload-dropzone and inline-error tokens: 480px maximum column, raised-ink dashed lime dropzone, one lime primary action, calm solid-error inline panel, sentence case, shared focus ring, descriptive selfie alt text, and safe bottom spacing.

- [x] Add comprehensive verification (AC: 1-10)
  - [x] Unit-test auth callback ID propagation without regressing all US2.1 authorize/registration cases.
  - [x] Unit-test validation boundaries: JPEG/JPG and PNG success, genuine HEVC-backed HEIC rejection before side effects, MIME/extension spoof, corrupt image, just below/exactly/above 10MB, exactly 512x512, either dimension below 512, and EXIF-rotated dimensions.
  - [x] Unit-test Cloudinary adapter success/failure and profile repository index retry/upsert/replacement mapping with mocked SDK/collection. Assert stored documents contain no binary data.
  - [x] Unit-test profile orchestration ordering, privacy, and compensation: validation blocks side effects; expiring URLs exclude internal IDs; Cloudinary failure blocks DB; DB failure/conflict exercises successful compensation and exhausted deletion retries with sanitized high-priority reconciliation logging; concurrent replacement cannot overwrite newer data; failed old-asset deletion remains queued and later retries.
  - [x] Route-test the exact HTTP contract, missing/false/understated/duplicate `Content-Length`, absent/chunked length, multipart overhead cap, duplicate/unexpected files, unforgeable ownership, and public DTO exclusion. Component-test picker cancel, same-file reselection, rapid selection, browser MIME `""`, preview decode failure, pending/error/success/replacement, URL cleanup, labels, roles, focus classes, and exact copy.
  - [x] Regression-test safe callback handling (including external/protocol-relative rejection), new-registration/Profile continuation, protected Profile sign-in return, trend-query preservation, Profile sign-out, navigation active states, and all existing AuthForm flows.
  - [x] Run `npm test -- --runInBand`, `npm run lint`, `npm run build`, and live browser checks for login -> Profile, valid JPG/PNG upload, HEIC rejection, other invalid cases, refresh persistence, replacement, sign-out/anonymous gate, 480px cap, and mobile/desktop navigation.

## Dev Notes

### Developer context and scope

- This story supplies the saved source selfie consumed by Story 2.3. It does not call YouCam, create a VTO task, select a trend/style, implement VTO polling/errors, or add retail links.
- “Capture” means native file upload only. Mobile browsers may offer their OS camera through the picker; no custom camera component, `getUserMedia`, modal, or separate desktop experience is permitted.
- The NFR mixes mechanical constraints with semantic photo-quality requirements. Only format, bytes, and dimensions are authoritatively enforceable here without an unapproved face-analysis system. The UI must teach the face/framing requirements; YouCam's later `error_no_face` result enforces them in Stories 2.3/2.4.
- A selfie is sensitive user media. Never log request bodies, buffers, URLs, public IDs, session tokens, or Cloudinary credentials. All reads/writes derive ownership from the authenticated server session.
- Cloudinary's default `upload` delivery is public and is forbidden here. Store assets with `type: "authenticated"`; generate a five-minute `private_download_url` server-side for Profile and future YouCam access. Story 2.3 must request a fresh URL immediately before its external call rather than persisting or reusing one. This API-delivered URL is intentionally chosen over premium token-based CDN access for the hackathon account, accepting Cloudinary's additional delivery-bandwidth cost.
- Dual-write residual risk: if Mongo replacement fails and every compensating Cloudinary deletion retry also fails, the new opaque authenticated asset can remain orphaned because the story may create only `user_profiles` and cannot durably record cleanup while Mongo itself is unavailable. Treat this as an explicit bounded operational risk: emit a sanitized high-priority log/correlation ID and retain the dedicated opaque Cloudinary folder for manual reconciliation. Do not claim exactly-once cleanup for that failure combination.

### Architecture compliance

- Preserve one-way dependencies: `app/api/upload` -> `lib/services/profile.ts` -> `lib/services/imageValidation.ts` + `lib/data/userProfiles.ts` + `lib/external/cloudinary.ts`. Route code must not import MongoDB/Cloudinary; data/external modules must not import services or Next.js request types.
- Reuse `lib/data/mongodb.ts#getDb`; mirror the retryable cached-index pattern established in `lib/data/users.ts`. Keep `users` auth-core-only and `user_profiles` one-to-zero/one keyed by string session `userId`.
- The architecture requires both Cloudinary `secure_url` and `public_id` plus metadata. `selfieUrl` maps to `secure_url`; `selfiePublicId` supports replacement/compensation cleanup.
- Native `request.formData()` alone cannot enforce a pre-parse limit. Bound the Web request stream first, then parse only the capped bytes and validate actual `File.size`; `Content-Length` is at most an early rejection hint.

### Existing files to preserve

- `lib/services/auth.ts`: currently returns `{ id, email }` from Credentials authorize but lacks callbacks that expose the id in `session.user`; add callbacks/types without weakening generic failure behavior or timing protection.
- `app/register/Providers.tsx` scopes `SessionProvider` to registration. Promote rather than duplicating if Profile uses client session APIs.
- `app/components/AppNavigation.tsx` currently hardcodes Feed as active and disables both future tabs. Refactor its current-surface API and tests; activate only Profile in this story.
- `app/components/AuthForm.tsx` currently sends every successful auth flow to `/`; update it for safe Profile continuation while preserving US2.1's mode/error/pending behavior. The preview CTA should include the local callback and optional selected-trend context.
- `.env.example`, `package.json`, and lockfile gain Cloudinary/Sharp entries only. Preserve Node `24.x`, Next `16.3.1`, React `19.2.8`, MongoDB `7.5.0`, NextAuth `4.24.15`, and all US2.1 security hardening.

### Latest technical information

- Cloudinary `2.10.0` remains npm `latest` at story creation and includes its own TypeScript declarations. Use the v2 server SDK; official docs recommend server-side upload methods and warn never to expose the API secret. Cloudinary's broader HEIC capability does not override the app's authoritative JPEG/PNG intake boundary; `private_download_url` provides an explicit `expires_at` for private/authenticated assets. [Cloudinary Node upload docs](https://cloudinary.com/documentation/node_image_and_video_upload) [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media) [Cloudinary format support](https://cloudinary.com/documentation/image_format_support) [npm package](https://www.npmjs.com/package/cloudinary)
- Sharp `0.35.3` is current and supports Node >=20.9. The standard Vercel-compatible build decodes JPEG/PNG but does not provide the custom libvips/libheif stack required for HEVC-backed HEIC. Direct HEIC intake is therefore deferred until the restoration criteria in `deferred-work.md` are met. [Sharp npm](https://www.npmjs.com/package/sharp) [Sharp metadata](https://sharp.pixelplumbing.com/api-input/)
- Next.js Route Handlers accept native `request.formData()`, but they are public endpoints and must authenticate internally; use one body read and keep error details private. [Next.js Backend-for-Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend) [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)

### Project structure notes

```text
app/
  api/upload/route.ts
  profile/page.tsx
  components/SelfieUploadForm.tsx
  components/AppNavigation.tsx                 # UPDATE
  components/AuthForm.tsx                      # UPDATE: safe callback
  components/__tests__/SelfieUploadForm.test.tsx
  components/__tests__/AppNavigation.test.tsx  # UPDATE
  components/__tests__/AuthForm.test.tsx       # UPDATE
lib/
  services/profile.ts
  services/imageValidation.ts
  services/__tests__/profile.test.tsx
  services/__tests__/imageValidation.test.tsx
  services/auth.ts                              # UPDATE: session id
  external/cloudinary.ts
  external/__tests__/cloudinary.test.tsx
  data/userProfiles.ts
  data/__tests__/userProfiles.test.tsx
types/next-auth.d.ts
next.config.ts                                  # UPDATE if next/image serves signed URLs
```

Co-locate service/data tests under their existing `__tests__` folders using `.test.tsx`. Page/server integration receives live browser coverage; extract synchronous presentation for RTL rather than directly rendering an async Server Component.

### Previous story intelligence

- US2.1 established the generic hot-reload-safe Mongo connection, retryable cached indexes, Credentials/JWT auth, thin route handlers, fixed error envelopes, server-side ownership, exact pending/error copy, and strong role/name assertions. Reuse those patterns.
- US2.1 review caught public-boundary abuse, unbounded bodies, timing differences, rejected-promise caches, dependency inversion, and missing error catches. Apply those lessons up front: bound multipart input, keep ownership in services, compensate partial external writes, catch failures, and test rejection recovery.
- The registration provider was intentionally scoped narrowly with a note to promote it when Stories 2.2+ need session awareness. Do not nest multiple providers.

### Git intelligence

- Recent commits completed and reviewed US1.2, US1.3, and US2.1, then activated the preview-to-registration CTA. Preserve the currently green baseline: 17 suites / 88 tests, ESLint, and production build.
- Current installed versions supersede stale architecture baselines: Next `16.3.1` and React `19.2.8` are authoritative for implementation.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.2, NFR4, Additional Requirements]
- [Source: `_bmad-output/planning-artifacts/prds/prd-whattheheel-2026-08-10/prd.md` — Journey 2, FR-03, Image Constraints]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md` — AD-1, AD-4, AD-5, AD-7, Consistency Conventions]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md` — Information Architecture, Component/State Patterns, Accessibility, Responsive Platform]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md` — upload-dropzone, inline-error, layout/focus tokens]
- [Source: `_bmad-output/implementation-artifacts/2-1-user-registration-login.md` — Dev Notes and review findings]
- [Source: `_bmad-output/project-context.md` — implementation/testing rules]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5.6)

### Debug Log References

- 2026-08-17: Resumed the partial implementation after the approved JPG/PNG course correction. Added missing auth callback/safe-return coverage, genuine HEVC rejection coverage, Cloudinary privacy/config tests, repository CAS tests, profile orchestration/compensation tests, upload-route contract tests, and upload UI edge-case coverage.
- 2026-08-17: Targeted US2.2 verification passes (7 focused suites / 56 tests); expanded repository run reaches 23 passing suites / 131 passing tests. Full regression is blocked only by pre-existing missing files `public/trends/strappy-stiletto-sandal.png` and `public/trends/patent-block-heel-pump.png`, which fail `trends.seed.test.tsx`.
- 2026-08-17: `npm run lint` and `npm run build` pass. Live Cloudinary upload verification is blocked because local `.env.local` has no `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, or `CLOUDINARY_API_SECRET`.
- 2026-08-17: Cloudinary variables were added locally and validated without disclosure. API authentication, authenticated image upload, and invalidating deletion all succeeded; the temporary opaque access-check asset was deleted. The missing Epic 1 trend assets were restored, clearing the regression blocker. Full verification now passes: 24 suites / 132 tests and ESLint.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Approved 2026-08-17 course correction applied: MVP selfie intake is JPG/JPEG and PNG only; genuine HEIC must be rejected before side effects, with restoration tracked in `deferred-work.md` and the approved sprint change proposal.
- Implemented authenticated user identity propagation, safe callback continuation, Profile gating, and session-owned profile access without trusting client identifiers.
- Implemented bounded authoritative JPEG/PNG validation, authenticated Cloudinary storage, five-minute private URLs, versioned MongoDB profile replacement, cleanup retries, and stable upload API envelopes.
- Implemented the responsive Profile/selfie UI, navigation activation, sign-out, inline validation, preview lifecycle handling, and HEIC guidance.
- Verification complete: 24 suites / 132 tests, ESLint, production build, and a live registration → Profile → PNG upload → HEIC rejection → replacement → refresh → anonymous-gate flow. Temporary MongoDB and Cloudinary test records were deleted.

### File List

- `.env.example`
- `app/api/upload/route.ts`
- `app/api/upload/__tests__/route.test.tsx`
- `app/components/AppNavigation.tsx`
- `app/components/AuthForm.tsx`
- `app/components/OverlayCanvas.tsx`
- `app/components/SelfieUploadForm.tsx`
- `app/components/SignOutButton.tsx`
- `app/components/__tests__/AppNavigation.test.tsx`
- `app/components/__tests__/AuthForm.test.tsx`
- `app/components/__tests__/OverlayCanvas.test.tsx`
- `app/components/__tests__/SelfieUploadForm.test.tsx`
- `app/components/__tests__/SignOutButton.test.tsx`
- `app/profile/page.tsx`
- `app/register/page.tsx`
- `lib/data/userProfiles.ts`
- `lib/data/__tests__/userProfiles.test.tsx`
- `lib/external/cloudinary.ts`
- `lib/external/__tests__/cloudinary.test.tsx`
- `lib/services/auth.ts`
- `lib/services/imageValidation.ts`
- `lib/services/profile.ts`
- `lib/services/__tests__/auth.test.tsx`
- `lib/services/__tests__/fixtures/genuine-hevc.heic`
- `lib/services/__tests__/imageValidation.test.tsx`
- `lib/services/__tests__/profile.test.tsx`
- `package-lock.json`
- `package.json`
- `types/next-auth.d.ts`
- `_bmad-output/implementation-artifacts/2-2-selfie-capture-profile-storage.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-17: Completed US2.2 authenticated selfie upload and profile storage implementation; added security, concurrency, compensation, API-contract, UI, and regression coverage; moved story to review.
