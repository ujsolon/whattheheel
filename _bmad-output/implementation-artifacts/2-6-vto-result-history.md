---
baseline_commit: 0a0090369259b06a34157494e5ccf85fad5423f3
---

# Story 2.6: VTO Result History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Added 2026-08-17, post-launch — not in the original PRD FR list. Prioritized ahead of Stories 2.4/2.5 (product decision) as a faster, higher-impact demo addition once Story 2.3's core VTO loop was live. See epics.md#Story 2.6 and architecture AD-8. -->

## Story

As a registered user,
I want to see my past AI try-on results on my profile,
so that I can revisit looks I've already generated without re-running them.

## Acceptance Criteria

1. **Given** a VTO task's polled status transitions to `success`, **when** the transition is persisted, **then** the result image is downloaded from YouCam's result URL and re-uploaded to this app's own Cloudinary storage (same authenticated/private asset pattern Story 2.2 established for selfies, AD-4) — YouCam retains processed results for only ~24 hours (`docs/ai-skin-analysis.md`: "Processed results are retained for 24 hours after completion"), so the raw YouCam URL is fetched exactly once and never stored or served past that transition (architecture AD-8).
2. **Given** a registered user with at least one successful VTO result, **when** they view their Profile screen, **then** a "Past Try-Ons" grid section shows each result's image and its trend's label, most recent first.
3. **Given** a registered user with zero successful VTO results, **when** they view Profile, **then** no history section renders at all — not an empty-state placeholder box.
4. **Given** the history grid, **when** rendered, **then** it is view-only: no delete/remove action, no re-trigger action, and clicking/tapping a thumbnail does nothing beyond what's already visible (image + label) — both deferred, this story is display-only.
5. **Given** a task created before this story shipped (which has no `trendId` or Cloudinary result fields — Story 2.3's original schema), **when** the history query runs, **then** that task is simply excluded from the history list rather than causing an error — no backfill/migration is performed (small hackathon dataset, acceptable one-time loss of pre-existing demo history).
6. **Given** any part of this story's new code, **when** it runs, **then** it follows the existing layered paradigm exactly: the YouCam result download lives in `lib/external/youcam.ts`, the Cloudinary re-upload lives in `lib/external/cloudinary.ts`, and all orchestration (when to copy, how to query history) lives in `lib/services/vtoTask.ts` (AD-2 — this is still the single VTO task owner) — no new Route Handler is added, since Profile is a Server Component that can call the service directly, exactly like it already does for `getMyProfile()`.

## Tasks / Subtasks

- [x] Add the YouCam result-download and Cloudinary result-upload primitives (AC: 1, 6)
  - [x] In `lib/external/youcam.ts`, add `export async function downloadResultImage(url: string): Promise<Buffer>` — a plain server-side `fetch(url)` followed by `.arrayBuffer()` → `Buffer.from(...)`. On a non-2xx response or a thrown network error, throw `YouCamApiError` with a new code `"youcam_result_download_failed"` (reuse the existing error class — this is still a YouCam-integration-boundary failure, just fetching a result asset instead of calling the task API itself).
  - [x] In `lib/external/cloudinary.ts`, add `export interface UploadedResult { secureUrl: string; publicId: string; format: string }` and `export async function uploadVtoResult(buffer: Buffer): Promise<UploadedResult>` — mirrors `uploadSelfie`'s `upload_stream` shape exactly (`resource_type: "image"`, `type: "authenticated"`, `public_id: randomUUID()`, `overwrite: false`) but targets folder `whattheheel/vto-results` instead of `whattheheel/selfies`, and additionally resolves `format` from Cloudinary's own upload response (`result.format`, e.g. `"jpg"`/`"png"`) — unlike selfies, there's no separate `validateImage()` step here to already know the format, since a YouCam-generated result is a known-good, already-validated image with no user-upload constraints to re-check.
- [x] Extend the `vto_tasks` data boundary (AC: 1, 5, 6)
  - [x] In `lib/data/vtoTasks.ts`, add `trendId: string` to `VtoTaskDocument` (set once, at task creation — see next task). Replace the existing `resultUrl?: string` field with `resultPublicId?: string` and `resultFormat?: string` — the collection no longer stores a bare result URL at all, only the Cloudinary reference needed to regenerate one on demand (same pattern `user_profiles.selfiePublicId` already uses). This is a clean field replacement, not an additive migration: existing pre-story documents simply won't have these fields, which Task "Query history" below handles by filtering them out (AC5) rather than crashing.
  - [x] Update `updateTaskStatus`'s parameter type from `Partial<Pick<VtoTaskDocument, "status" | "errorCode" | "resultUrl">>` to `Partial<Pick<VtoTaskDocument, "status" | "errorCode" | "resultPublicId" | "resultFormat">>`.
  - [x] Add `export async function findSuccessfulTasksByUser(userId: string): Promise<VtoTaskDocument[]>` — `collection().find({ userId, status: "success" }).sort({ createdAt: -1 }).toArray()`. This is the only new query this story needs; no new index required (an index on `{ userId, status }` would be a reasonable future optimization but the free-tier M0 cluster and hackathon-scale data volume don't need it yet — don't add one preemptively).
- [x] Wire the result copy-on-success into `createVtoTask`/`getVtoTaskStatus` (AC: 1, 6)
  - [x] In `createVtoTask` (`lib/services/vtoTask.ts`), add `trendId: trend.id` to the object passed to `createTask(...)` — the trend is already resolved in this function via `getTrendById(trendId)`, so this is a one-line addition, no new lookup.
  - [x] In `getVtoTaskStatus`, the `result.status === "success"` branch currently does `updateTaskStatus(taskId, { status: "success", resultUrl: result.resultUrl })` and returns `{ taskId, status: "success", resultUrl: result.resultUrl }`. Replace this with: download the YouCam result via `youcam.downloadResultImage(result.resultUrl)`, upload it via `cloudinary.uploadVtoResult(buffer)`, persist `{ status: "success", resultPublicId: uploaded.publicId, resultFormat: uploaded.format }` via `updateTaskStatus`, and return `{ taskId, status: "success", resultUrl: getPrivateSelfieUrl(uploaded.publicId, uploaded.format, Date.now()) }` — reusing the exact same signed-URL helper already used for selfies (its implementation has no selfie-specific logic despite the name; reusing it as-is here is deliberate — see Dev Notes for why a rename wasn't pursued in this story).
  - [x] `toView()` (the helper used both for the still-pending case and for tasks whose terminal status was already persisted from a prior poll) currently does `resultUrl: task.resultUrl` unconditionally. Update it to resolve a fresh signed URL from `task.resultPublicId`/`task.resultFormat` when `task.status === "success"` — this is the same class of bug Story 2.4 already had to catch and fix for `errorCode`/`message` (a value resolved on the fresh-poll path but forgotten on the already-terminal/reload path); don't repeat it here. A task with `status === "success"` but no `resultPublicId` (a pre-story task, AC5) should resolve to `resultUrl: undefined` in `toView()` rather than throwing — `VtoStylist.tsx`'s existing success-phase render already guards on `resultUrl` being truthy (`phase === "success" && resultUrl`), so this degrades gracefully without any client-side change.
  - [x] No compensation/rollback logic is added for the case where the Cloudinary upload succeeds but the subsequent `updateTaskStatus` write fails (or vice versa). *(Correction to this bullet's original premise — see Debug Log: `getVtoTaskStatus` already had a concurrent-poll race guard built in Story 2.3, not "exactly one writer per task" as assumed when this story was scoped. The design conclusion is unchanged: an occasional orphaned Cloudinary asset on the losing side of that race is accepted rather than adding cleanup machinery, consistent with hackathon-scope minimalism.)*
- [x] Add the history-list service function (AC: 2, 3, 5)
  - [x] In `lib/services/vtoTask.ts`, add `export interface VtoHistoryItem { taskId: string; trendLabel: string; resultUrl: string; createdAt: string }` and `export async function getVtoHistory(): Promise<VtoHistoryItem[]>` — calls `requireAuthenticatedUser()`, then `findSuccessfulTasksByUser(user.id)`, then maps each task to a `VtoHistoryItem`: resolve `trendLabel` via `getTrendById(task.trendId)?.label`, resolve `resultUrl` via `getPrivateSelfieUrl(task.resultPublicId, task.resultFormat, Date.now())`. **Filter out (don't map) any task missing `trendId`, `resultPublicId`, or `resultFormat`, or whose trend can no longer be resolved** — this is what satisfies AC5 for pre-story tasks without a false-positive broken tile, and defends against a trend being removed from `public/trends.json` after a task referencing it was created. *(Marked complete 2026-08-18 — implemented and tested from the start; the checkbox itself had drifted out of sync with the code, caught by code review.)*
  - [x] `createdAt` is serialized to an ISO string (`task.createdAt.toISOString()`) at this boundary — Server Components can pass plain serializable data to their own JSX without issue, but keeping the shape string-based here matches the project's existing `ProfileView.updatedAt: string | null` convention (`lib/services/profile.ts`) rather than leaking a `Date` object past the service boundary.
- [x] Add the history grid UI and wire it into Profile (AC: 2, 3, 4 — **AC4 superseded 2026-08-18 by Story 2.7**, which deliberately adds a tap-to-view-full-image interaction on top of these tiles; "no click interaction" no longer holds and is not a defect)
  - [x] Add `app/components/VtoHistoryGrid.tsx` — a plain function component (no `"use client"` needed; it has no interactivity, state, or event handlers, so it can render as part of the Server Component tree exactly like `TrendCard` usages already do in server-rendered contexts). Props: `{ items: VtoHistoryItem[] }` (import the type from `@/lib/services/vtoTask`). Returns `null` immediately when `items.length === 0` (AC3 — the "no section at all" requirement lives here, not as a conditional in the page, so the page stays simple). Otherwise renders a heading ("Past Try-Ons", hype-register per `EXPERIENCE.md`'s convention that discovery/celebration moments use hype language — this is closer to a celebration callback than a transactional instruction) above a `grid grid-cols-2 gap-2 sm:grid-cols-3` grid (matching the exact grid classes `VtoStylist.tsx`'s trend picker already uses, for visual consistency), one `<img>` + trend label per item, each image with `alt={`Your past try-on: ${item.trendLabel}`}` (matching the existing result-image alt-text convention from Story 2.3's success state). *(Story 2.7 later made this a Client Component with a `<button>` wrapper per tile, superseding the original "no click interaction" line — see AC4 note above.)*
  - [x] In `app/profile/page.tsx`, call `getVtoHistory()` alongside the existing `getMyProfile()` call (both awaited; order doesn't matter, they're independent reads — consider `Promise.all` for a small latency win, not required), and render `<VtoHistoryGrid items={history} />` after the existing selfie-upload section, before the sign-out button. If `getVtoHistory()` throws `UnauthorizedError` this can't actually happen in practice (the page already redirects before this point whenever `getMyProfile()` throws that same error, and both calls run under the same session) — no separate try/catch needed around this second call.
- [x] Add and run verification (AC: 1-6) — **no mock exists for YouCam/Cloudinary; keep any live check minimal, reusing state from the existing VTO loop rather than spending new units purely for this story.**
  - [x] Unit test `lib/external/youcam.ts`: extend the existing mocked-`fetch` suite with `downloadResultImage` — a successful fetch resolves to a `Buffer` matching the response body, a non-2xx response and a thrown network error both produce a `YouCamApiError` with code `"youcam_result_download_failed"`.
  - [x] Unit test `lib/external/cloudinary.ts`: extend the existing mocked-SDK suite with `uploadVtoResult` — asserts the `upload_stream` call uses folder `whattheheel/vto-results` (distinct from `whattheheel/selfies`) and that the returned `format` comes from the mocked SDK response, not guessed/hardcoded.
  - [x] Unit test `lib/data/vtoTasks.ts`: extend with `findSuccessfulTasksByUser` — asserts the mocked collection's `find` is called with `{ userId, status: "success" }` and `.sort({ createdAt: -1 })`.
  - [x] Unit test `lib/services/vtoTask.ts`: extend `createVtoTask`'s existing "persists the new task" test to assert `trendId` is included in the `createTask` call. Rewrite the existing "persists and returns a success transition" test in `getVtoTaskStatus`'s describe block to mock `downloadResultImage`/`uploadVtoResult` and assert `updateTaskStatus` is called with `{ status: "success", resultPublicId, resultFormat }` (no more `resultUrl`), and that the returned view's `resultUrl` is built via a (mocked) `getPrivateSelfieUrl` call using those same values. Add a case for `toView()`'s already-terminal path (a task fetched from Mongo with `status: "success"` and populated `resultPublicId`/`resultFormat` resolves a signed `resultUrl`; the same status with those fields `undefined` — a pre-story task — resolves `resultUrl: undefined` instead of throwing, AC5). Add a full `getVtoHistory` describe block: unauthenticated rejects; zero successful tasks returns `[]`; a mix of successful tasks with and without `trendId`/result fields returns only the well-formed ones, each with the correct `trendLabel`/`resultUrl`/ordering (assert the service passed through `findSuccessfulTasksByUser`'s already-sorted order rather than re-sorting itself, matching the "data layer owns the query, service layer doesn't second-guess it" convention used everywhere else in this codebase).
  - [x] Component-test `VtoHistoryGrid.tsx` (new `__tests__` file): renders `null`/nothing when `items` is empty (AC3); renders one image + label per item with the correct alt text when non-empty; asserts no anchor/button wraps any tile (AC4 — a `queryAllByRole("link")`/`queryAllByRole("button")` scoped to the grid should be empty).
  - [x] Extend `app/profile/__tests__/page.test.tsx`: mock `getVtoHistory` alongside the existing `getMyProfile` mock — a case with history items renders the "Past Try-Ons" heading; a case with an empty array does not render it.
  - [x] Run `npm test`, `npm run lint`, `npm run build`. A live check is optional here (Story 2.3 already proved the full success path live, and this story's only new external interaction is a plain `fetch` + Cloudinary upload of a resulting image, both low-risk/well-understood primitives already exercised by the selfie upload path) — if one successful VTO trigger is already going to happen during manual QA of this story, just confirm the resulting Profile page shows that result in the history grid on reload; don't spend a second VTO call purely to re-prove the copy step in isolation.

### Review Findings

_Code review 2026-08-18 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, all findings verified against live code)._

- [x] [Review][Patch] **Catch a Cloudinary/download failure and mark the task `error` for a clean retry** — resolved 2026-08-18 (option b): wrap `downloadResultImage()`/`uploadVtoResult()` in try/catch inside the `result.status === "success"` branch; on failure, call `updateTaskStatus(taskId, { status: "error", errorCode: "vto_result_copy_failed" })` (a new app-internal code, not a YouCam one) and return the error view. `"vto_result_copy_failed"` is deliberately left out of Story 2.4's `ERROR_COPY` map so it falls through to the existing `error_inference` generic-fallback copy — no new user-facing string needed. The user's existing "try another photo" retry path (Story 2.4) then creates a new task; a sustained Cloudinary outage costs a second YouCam unit on retry, an accepted narrow gap rather than building a no-rebill retry path [lib/services/vtoTask.ts:129-138]
- [x] [Review][Patch] Wrap `getVtoHistory()` in the page's existing error handling — a history failure currently 500s the whole Profile screen [app/profile/page.tsx:24]
- [x] [Review][Patch] Result signed URLs use the 300s default expiry; pass an explicit longer lifetime (the file already documents 300s failing live) [lib/services/vtoTask.ts:140,163,191]
- [x] [Review][Patch] Move `response.arrayBuffer()` inside the try/catch and add content-type + size-cap validation on the downloaded result [lib/external/youcam.ts:140-157]
- [x] [Review][Patch] Validate `uploaded.format` before persisting — an absent format writes a `…undefined` signed URL and silently drops the task from history forever [lib/services/vtoTask.ts:137,140]
- [x] [Review][Patch] Guard `task.createdAt.toISOString()` in the malformed-task filter it sits next to [lib/services/vtoTask.ts:192]
- [x] [Review][Patch] Add an `onError` fallback to the history grid `<img>` — an expired/failed URL currently renders a bare broken-image tile [app/components/VtoHistoryGrid.tsx:39]
- [x] [Review][Patch] "Past Try-Ons" is a `<p>`; use a real heading element for document outline [app/components/VtoHistoryGrid.tsx:24]
- [x] [Review][Patch] Empty history still renders a `mt-6` spacer div, contradicting AC3's "no section at all" [app/profile/page.tsx:25]
- [x] [Review][Patch] `trendId` is typed required but guarded as optional (dead code to the typechecker; tests cast `as never`) — make it optional to match AC5's reality [lib/data/vtoTasks.ts:7]
- [x] [Review][Patch] Guard the service against client-side import — implemented as a manual `if (typeof window !== "undefined") throw ...` runtime check rather than the `server-only` npm package, since that package isn't an existing dependency and adding one wasn't pre-approved; same protective effect with zero new dependencies [lib/services/vtoTask.ts:1]
- [x] [Review][Patch] ER diagram gained `resultPublicId` but not `resultFormat`, though both are required together [ARCHITECTURE-SPINE.md]
- [x] [Review][Patch] Check off this story's own "Add the history-list service function" task (implemented + tested) and annotate AC4 as superseded by Story 2.7 [2-6-vto-result-history.md:41-43]
- [x] [Review][Defer] Unbounded history query — no `.limit()`, no `{userId, status}` index, unindexed sort [lib/data/vtoTasks.ts:62] — deferred, story explicitly scoped this out at hackathon data volume
- [x] [Review][Defer] Pre-deploy successful tasks also lose their result on the `/stylist` reload path, not just in history [lib/services/vtoTask.ts:161-165] — deferred, documented data-migration tradeoff
- [x] [Review][Defer] `VtoHistoryItem.createdAt` is computed and shipped but rendered by no consumer [lib/services/vtoTask.ts:192] — deferred, harmless dead payload
- [x] [Review][Defer] `youcam_result_download_failed` sits outside the AD-6 locked error contract [lib/external/youcam.ts:145] — deferred, Story 2.4 owns the error-copy map and should absorb it
- [x] [Review][Defer] No `deleteVtoResult` — VTO result assets are never deleted under any circumstance [lib/external/cloudinary.ts] — deferred, story accepted orphaned assets

## Dev Notes

### Developer context and scope

- This story is a direct extension of Story 2.3's `lib/services/vtoTask.ts`/`lib/data/vtoTasks.ts` (the single VTO task owner, AD-2) and Story 2.2's Cloudinary asset pattern (`lib/external/cloudinary.ts`, AD-4) — it introduces no new subsystem, only a second Cloudinary asset type (VTO results, alongside selfies) and a second read path (history list, alongside single-task polling) through code that already exists.
- **This story was added post-launch, outside the original PRD/epics.md scope**, prioritized ahead of Stories 2.4 (VTO Failure Handling) and 2.5 (Buy Now Links) as a faster, more demo-visible addition once Story 2.3's core loop was confirmed working live. It has no PRD FR — `epics.md#Story 2.6` and `ARCHITECTURE-SPINE.md#AD-8` were both added specifically to house it, following the same "resolve and document the decision inline" approach Story 2.3 used for its own out-of-spec gender-preference addition.
- The single most important technical fact driving this story's design: **YouCam does not keep result images forever.** `docs/ai-skin-analysis.md` states "Processed results are retained for 24 hours after completion" — confirmed during this story's planning, not assumed. A history feature that just stored the raw YouCam URL would silently show broken images to any user who checks their history more than a day after generating a look. This is why AC1/AD-8 require an immediate, one-time copy to this app's own Cloudinary storage at the moment of success — there is no simpler version of this story that is still correct.
- Scope is display-only, per epics.md's own AC4: no delete, no re-trigger-from-history, no detail/expanded view. Resist the urge to add any of these even though they'd be small — they're explicitly out of scope and would just be undocumented, unrequested surface area.

### Architecture compliance

- AD-8 (new, this story): "The moment a VTO task's polled status transitions to `success`, `lib/services/vtoTask.ts` downloads the YouCam-hosted result image and re-uploads it to Cloudinary using the same authenticated/private asset pattern Story 2.2 established for selfies (AD-4)... `vto_tasks` stores the Cloudinary `resultPublicId`... and every read generates a fresh signed URL... never a long-lived stored URL." This story's `getVtoTaskStatus`/`toView()` changes are the literal implementation of this rule.
- AD-2 still applies unchanged: `lib/services/vtoTask.ts` remains the only place VTO task orchestration logic lives, including the new `getVtoHistory` function — do not add a separate `lib/services/vtoHistory.ts` or similar; this is still "one file, one owner."
- AD-1 (server-only external calls) applies to the two new functions exactly like every other external call in this app: `downloadResultImage` and `uploadVtoResult` are both called only from `lib/services/vtoTask.ts`, running on the Node.js runtime (already guaranteed — nothing in the call chain changes `export const runtime` anywhere; `app/profile/page.tsx` is already a Server Component, not an Edge/Client one).
- Layered paradigm (Route Handlers → Services → Data/External): this story adds **zero new Route Handlers**, which is a deliberate deviation from Story 2.3's pattern (which added two). History is read-only, server-rendered data with no client interactivity, so `app/profile/page.tsx` calling `getVtoHistory()` directly — exactly how it already calls `getMyProfile()` — is the correct, simplest shape; adding a `GET /api/vto-history` endpoint nobody calls from the client would be unused surface area.
- Consistency Conventions: the `resultPublicId`/`resultFormat` field naming mirrors `user_profiles`' existing `selfiePublicId`/`format` fields exactly — same naming shape for the same kind of Cloudinary reference, consistent with the project's established convention rather than inventing new terminology.

### Existing files to preserve / current state (read before editing)

- `lib/data/vtoTasks.ts`: current `VtoTaskDocument` has `taskId, userId, status, errorCode?, srcUrl, refUrl, style, gender, resultUrl?, createdAt, updatedAt` — no `trendId` today. `updateTaskStatus`'s filter (`{ taskId, status: "pending" }`) and unique index on `taskId` are unchanged by this story; only the `Pick<...>` field list for the `fields` parameter changes.
- `lib/external/cloudinary.ts`: current exports are `uploadSelfie`, `deleteSelfie`, `getPrivateSelfieUrl(publicId, format, now?, expiresInSeconds?)`. `getPrivateSelfieUrl`'s implementation has no selfie-specific logic at all — it's a generic signed-URL generator that happens to have a selfie-flavored name because it was written for that one use case first. **This story reuses it as-is for VTO results rather than renaming it** — a rename (e.g. to `getPrivateAssetUrl`) would touch every existing call site (`lib/services/profile.ts`, `lib/services/vtoTask.ts`'s selfie-fetch call) for a purely cosmetic gain, which isn't worth the diff size or review risk in a story that's otherwise additive. If a future story adds a third asset type, that's the more natural trigger point to revisit the name.
- `lib/services/vtoTask.ts`: full current implementation was read in full during Story 2.4's creation and is unchanged since (Story 2.4 is still only `ready-for-dev`, not yet implemented) — see that story's Dev Notes for the exact current text of `getVtoTaskStatus`/`toView()` if useful context, but implement Story 2.6 first and let Story 2.4 build on top of whichever version lands first (they touch the same file in different, non-conflicting spots: 2.4 touches the error branch, 2.6 touches the success branch and adds `getVtoHistory`).
- `app/profile/page.tsx`: current file is a single dense server component (already reproduced in full above during this story's research) rendering email, `SelfieUploadForm`, a conditional "Continue to AI Stylist" link, and `SignOutButton`. Adding one more `await` call and one more conditionally-rendered component is additive — don't restructure the existing dense-JSX style unless it becomes genuinely hard to read with the addition (a small history section shouldn't tip it over).
- `app/components/TrendCard.tsx`/`VtoStylist.tsx`: not modified by this story. `VtoHistoryGrid.tsx` deliberately does not reuse `TrendCard` (which is a `<Link>`-based, click-navigable component) since AC4 requires the history tiles to be non-interactive — reusing `TrendCard` here would either require stripping its link behavior (more invasive than just writing a small new presentational component) or would violate AC4 by making tiles clickable. Matching `VtoStylist.tsx`'s trend-picker grid *classes* (for visual consistency) without reusing the *component* is the right level of reuse here.

### Interaction and edge-case notes

- **Pre-story tasks silently drop out of history (AC5), by design.** Any `vto_tasks` document written by Story 2.3's original code (before this story's field changes) has no `trendId`/`resultPublicId`/`resultFormat`. `getVtoHistory`'s filter treats these exactly like malformed/incomplete data — excluded, not errored. This is a one-time, small-dataset (hackathon demo data) tradeoff explicitly accepted rather than writing a backfill script that would need to re-fetch already-expired YouCam URLs (which, per AD-8's own premise, may already be gone by the time this story ships anyway).
- **A trend removed from `public/trends.json` after a task referencing it was created** produces the same "excluded from history" outcome via the same filter (`getTrendById` returning `undefined`) — one code path handles both edge cases, not two.
- **No new index is added** on `vto_tasks` for the `{ userId, status }` query — flagged as a reasonable future optimization if the collection grows, not a correctness requirement at hackathon scale (an M0 free-tier cluster with a handful of demo users generating at most a few dozen tasks each doesn't need one).
- **Unit cost**: this story adds zero new YouCam unit consumption — `downloadResultImage` fetches a plain HTTPS asset URL (not a billed API call), and re-polling an already-`success` task's status endpoint (which can happen if a Cloudinary copy attempt fails mid-way and the next poll retries) doesn't re-charge, per the same "no units consumed" language `docs/ai-skin-analysis.md` uses for the running/pending state, reasoned by analogy to apply to already-terminal state too (the actual VTO generation is charged once, at the moment YouCam itself computes the result — after that, status is free to re-read).

### Testing requirements

- Jest + React Testing Library, co-located `__tests__/`, `.test.tsx` naming — same convention every story so far.
- Follow `lib/services/__tests__/vtoTask.test.tsx`'s existing mocking shape (mock `@/lib/external/youcam`, `@/lib/external/cloudinary`, `@/lib/data/vtoTasks`, `@/lib/data/trends`, `@/lib/services/auth`) — this story extends the same file, same mocks, no new mocking infrastructure needed.
- `getVtoHistory`'s "filters out malformed tasks" behavior is this story's highest-value test, analogous to how Story 2.3 flagged the ownership-mismatch-404 test as its highest-value one — a regression here means broken `<img>` tiles rendered to a real user, not just a cosmetic issue.
- No fake timers needed anywhere in this story (unlike `VtoStylist.tsx`'s polling tests) — everything here is a single async request/response, not a polling loop.

### Previous story intelligence

- Story 2.3 established the exact `youcam.ts`/`cloudinary.ts` client conventions this story extends: typed errors (`YouCamApiError`), server-only fetch wrappers, and — critically — the lesson (from its own Debug Log) that YouCam's real response shapes should be verified against actual documentation/live data rather than assumed; this story's `downloadResultImage` is a plain asset fetch with a well-understood shape (raw image bytes), so that specific risk doesn't reapply here, but the general discipline of not guessing at external response shapes still does for anything touching Cloudinary's SDK response object.
- Story 2.4 (not yet implemented as of this story's creation, status `ready-for-dev`) independently identified and documented the exact same class of bug this story's `toView()` task explicitly calls out: a value resolved correctly on the fresh-poll code path but forgotten on the already-terminal/page-reload code path (`errorCode`/`message` for 2.4, `resultPublicId`/`resultFormat` → `resultUrl` for this story). Both stories touch `toView()`; whichever lands second should re-read the other's changes to that function before editing it, to avoid one story's fix accidentally reverting the other's.
- Story 2.2's `uploadSelfie`/`deleteSelfie`/`getPrivateSelfieUrl` trio in `lib/external/cloudinary.ts` is the direct template for this story's `uploadVtoResult` — matched folder/type/public_id conventions deliberately, varied only the folder name and the addition of a `format` field on the return value.

### Project Structure Notes

Expected story footprint — mostly updates to files Stories 2.2/2.3 already created, plus one new small presentational component:

```text
app/
  profile/
    page.tsx                            # UPDATE: fetch + render VtoHistoryGrid
    __tests__/page.test.tsx             # UPDATE: history-present / history-empty cases
  components/
    VtoHistoryGrid.tsx                  # NEW: view-only grid, returns null when empty
    __tests__/
      VtoHistoryGrid.test.tsx           # NEW
lib/
  external/
    youcam.ts                           # UPDATE: downloadResultImage
    __tests__/youcam.test.tsx           # UPDATE
    cloudinary.ts                       # UPDATE: uploadVtoResult
    __tests__/cloudinary.test.tsx       # UPDATE
  data/
    vtoTasks.ts                         # UPDATE: trendId field, resultPublicId/resultFormat replacing resultUrl, findSuccessfulTasksByUser
    __tests__/vtoTasks.test.tsx         # UPDATE
  services/
    vtoTask.ts                          # UPDATE: trendId on create, result copy-on-success, toView() fix, getVtoHistory
    __tests__/vtoTask.test.tsx          # UPDATE
```

No changes to `app/api/vto-tasks/*` (both Route Handlers are pure pass-throughs and need nothing new), `app/components/VtoStylist.tsx` (already renders whatever `resultUrl` string it's given, regardless of how that URL was produced), or `app/stylist/page.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: VTO Result History]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#AD-8 — VTO result durability, AD-2, AD-4, Structural Seed ER diagram, Capability → Architecture Map]
- [Source: docs/ai-skin-analysis.md — "Processed results are retained for 24 hours after completion"]
- [Source: _bmad-output/implementation-artifacts/2-3-ai-virtual-try-on-generation.md — read directly: lib/services/vtoTask.ts, lib/data/vtoTasks.ts, lib/external/cloudinary.ts, lib/external/youcam.ts, app/profile/page.tsx, app/components/VtoStylist.tsx (all re-read in full during this story's creation)]
- [Source: _bmad-output/implementation-artifacts/2-4-vto-failure-handling.md — Dev Notes, "the same class of bug" (fresh-poll vs. already-terminal `toView()` resolution) this story's own equivalent task explicitly cross-references]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

Claude (Sonnet 5)

### Debug Log References

- 2026-08-17: Re-reading `lib/services/vtoTask.ts`'s current (post-2.3) state during Task 3 found it already has a concurrent-poll race guard in `getVtoTaskStatus`'s success/error branches (`updateTaskStatus`'s `{taskId, status:"pending"}` filter can lose to a simultaneous poll; the loser re-fetches the authoritative winning document) — this wasn't accounted for when this story was scoped (its Dev Notes describe `vto_tasks` as having "exactly one writer per task"). Preserved the existing race-loser fallback path unchanged and folded the new Cloudinary copy step into the winner path only; a losing attempt's Cloudinary upload is simply left orphaned (not deleted), which matches the story's already-stated "no compensation machinery" scope decision even though the underlying reasoning needed this correction.

### Completion Notes List

- Implemented VTO result durability (AD-8): on a fresh `success` poll, `lib/services/vtoTask.ts` now downloads the YouCam result image (`youcam.downloadResultImage`) and re-uploads it to Cloudinary (`cloudinary.uploadVtoResult`, folder `whattheheel/vto-results`) before persisting, storing only `resultPublicId`/`resultFormat` — never a bare URL. `toView()` regenerates a fresh signed URL from those fields on every read (fresh-poll and already-terminal/reload paths both covered), degrading to `resultUrl: undefined` for pre-story tasks missing those fields rather than throwing (AC5).
- Added `getVtoHistory()` — the single new read path this story needed, returning only well-formed successful tasks (trend still resolvable, result fields present), sorted newest-first by the data layer (`findSuccessfulTasksByUser`).
- Added `app/components/VtoHistoryGrid.tsx` (view-only, returns `null` when empty) and wired it into `app/profile/page.tsx` below the selfie upload section.
- Corrected an assumption made when this story was scoped: `getVtoTaskStatus` already has a concurrent-poll race guard (Story 2.3), not "exactly one writer per task" as the story's Dev Notes assumed — see Debug Log. The design conclusion (no compensation/rollback machinery) held regardless.
- Full regression suite (222 tests, 33 suites), lint, and production build all pass with no regressions. No live YouCam/Cloudinary call was made for this story specifically — Story 2.3 already proved the underlying primitives live, and this story's new external interactions (a plain HTTPS fetch, a second Cloudinary upload target) are low-risk extensions of already-proven code paths.

### File List

- `lib/external/youcam.ts` (updated — `downloadResultImage`)
- `lib/external/__tests__/youcam.test.tsx` (updated)
- `lib/external/cloudinary.ts` (updated — `uploadVtoResult`, `UploadedResult`)
- `lib/external/__tests__/cloudinary.test.tsx` (updated)
- `lib/data/vtoTasks.ts` (updated — `trendId` field, `resultPublicId`/`resultFormat` replacing `resultUrl`, `findSuccessfulTasksByUser`)
- `lib/data/__tests__/vtoTasks.test.tsx` (updated)
- `lib/services/vtoTask.ts` (updated — `trendId` on create, result copy-on-success, `toView()` fix, `getVtoHistory`)
- `lib/services/__tests__/vtoTask.test.tsx` (updated)
- `app/components/VtoHistoryGrid.tsx` (new)
- `app/components/__tests__/VtoHistoryGrid.test.tsx` (new)
- `app/profile/page.tsx` (updated — fetches and renders VTO history, error boundary around the history read, dead spacer div removed)
- `app/profile/__tests__/page.test.tsx` (updated)
- `_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md` (updated — ER diagram gained `resultFormat`, review finding)
- `_bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md` (updated — Profile IA row, review finding)

## Change Log

- 2026-08-17: Implemented VTO Result History end-to-end (YouCam result-download client, Cloudinary result-upload client, `vto_tasks` schema extension, `getVtoHistory` service function, and the Profile history grid), per architecture AD-8 (result durability — YouCam retains results only ~24h). Advanced the story to review.
- 2026-08-18: Code review (with Story 2.7) found 2 High findings — a Cloudinary/download failure could strand a task in `pending` forever, and `getVtoHistory()` had no error boundary, taking down the whole Profile page on failure — plus 11 Medium/Low findings (300s URL expiry regression, unvalidated downloaded bytes, missing `onError` fallback, non-semantic heading, dead spacer div, `trendId` type mismatch, missing client-import guard, ER diagram drift, a stale unchecked task checkbox). All patched; 4 pre-existing/accepted items deferred to `deferred-work.md`. Full suite (269 tests), lint, and build all green. Advanced to done.
