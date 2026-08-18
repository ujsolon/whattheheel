---
baseline_commit: a2dd7a8f4307e2c1255b04d852b9d9664614c2ab
---

# Story 2.4: VTO Failure Handling

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want clear guidance when my AI Stylist request fails,
so that I understand what went wrong and can retry without frustration.

## Acceptance Criteria

1. **Given** a VTO task's polled status is `error` with a YouCam-reported error code, **when** the client renders the failure, **then** it shows the exact locked, verbatim copy for that code from `EXPERIENCE.md`'s Voice and Tone table (`error_no_face`, `error_download_image`, `error_inference`, `error_nsfw_content_detected`, `exceed_max_filesize`) — replacing today's single generic fallback that Story 2.3 deliberately left as scope for this story.
2. **Given** the error code is specifically `error_no_face`, **when** shown, **then** the copy reads exactly "We couldn't detect a face — try a front-facing selfie with good lighting." (epics.md calls this one out explicitly; it's also the most likely real failure mode given this app's selfie-capture flow).
3. **Given** the error code is `invalid_parameter`, **when** shown, **then** the user sees the same copy as `error_inference` ("Something went wrong generating your preview — please try again.") while the actual `invalid_parameter` code is logged server-side only — it indicates a bug in this app's own request construction, not something the user can fix (AD-6).
4. **Given** any user-facing error is displayed — any of the five codes above, **or** the pre-existing client-side 90-second polling timeout from Story 2.3 (which has no YouCam error code at all) — **when** the user chooses to retry, **then** a "Try another photo" action re-opens the Selfie Upload control (`SelfieUploadForm`, Story 2.2) inline on the same `/stylist` screen, without navigating away (`EXPERIENCE.md`'s inline-error component pattern: "re-opens the Selfie Upload control in place — the user doesn't leave the AI Stylist surface to retry").
5. **Given** the user saves a new selfie through that re-opened control, **when** the save succeeds, **then** the screen returns to the trigger-ready `idle` state with the previously selected trend and gender preference still intact — the user is not forced to re-pick either.
6. **Given** the error-code-to-copy mapping, **when** implemented, **then** it lives in exactly one place — a co-located map in `lib/services/vtoTask.ts` — and no other file (Route Handler, client component) independently derives or duplicates any of the five strings (AD-6: "fixed handling in exactly one place").
7. **Given** this story's scope, **when** complete, **then** no new MongoDB collections or `vto_tasks` fields are introduced — `errorCode` continues to be persisted exactly as Story 2.3 built it; this story only adds the copy map and the inline UI on top of what already exists (epics.md's explicit scope note).

## Tasks / Subtasks

- [x] Add the AD-6 error-copy map and resolve it server-side (AC: 1, 2, 3, 6, 7)
  - [x] In `lib/services/vtoTask.ts`, add a module-level `const ERROR_COPY: Record<string, string>` with exactly the five keys and their verbatim locked strings from `EXPERIENCE.md`'s Voice and Tone table (see Dev Notes for the exact table — copy every character, including the em dashes). Do not add an `invalid_parameter` entry to this map — it deliberately falls through to the default.
  - [x] Change `VtoTaskView`'s error shape from `{ status: "error"; errorCode?: string }` to `{ status: "error"; message: string }` — the raw YouCam error code is no longer sent to the client at all (for any code, not just `invalid_parameter`); only the resolved, locked copy crosses the boundary. This is a deliberate tightening of Story 2.3's original shape, not a bug fix — Story 2.3 explicitly deferred this exact mapping to this story.
  - [x] In `getVtoTaskStatus`, where the `result.status === "error"` branch currently does `await updateTaskStatus(taskId, { status: "error", errorCode: result.errorCode })` and returns `{ taskId, status: "error", errorCode: result.errorCode }`: keep the `updateTaskStatus` call exactly as-is (the raw code must still be persisted to `vto_tasks.errorCode` for ops visibility — no schema change here, AC7), but change the returned view to resolve `message = ERROR_COPY[result.errorCode] ?? ERROR_COPY.error_inference`. When `result.errorCode === "invalid_parameter"` specifically, additionally call `console.error("vto_invalid_parameter", { correlationId: randomUUID(), taskId })` before returning — this is the "logged server-side only" half of AC3; `invalid_parameter` signals a bug in this app's own request construction (e.g. a bad gender/style value), so it deserves operator visibility that a normal user-fixable error doesn't.
  - [x] The unmapped-code fallback (`?? ERROR_COPY.error_inference`) is a deliberate defensive default, not just for `invalid_parameter` — it also covers any future/undocumented YouCam code this app hasn't seen yet, so the UI never renders a blank or raw-code string.
- [x] Update the polling/error UI in `VtoStylist.tsx` to use the resolved message (AC: 1, 2, 3)
  - [x] In `poll()`, the response body type currently reads `{ data?: { status?: string; resultUrl?: string } }` — extend it to `{ data?: { status?: string; resultUrl?: string; message?: string } }`, and when `status === "error"`, store `body.data?.message` in new state (e.g. `errorMessage`) before setting `phase("error")`.
  - [x] The error-phase render currently always shows the module-level `GENERIC_ERROR_COPY` constant. Change it to show `errorMessage` when one is set (a real YouCam-reported error), and continue to fall back to `GENERIC_ERROR_COPY` for the two cases that have no server-provided message at all: the 90-second `ceilingTimerRef` timeout, and the defensive branches in `trigger()` (non-2xx POST response, missing `taskId` in the response body, or a thrown network error) — none of these represent a real YouCam error code, so there is nothing in `ERROR_COPY` to look up. Keep `GENERIC_ERROR_COPY`'s existing text unchanged; it is already word-for-word the same string as `ERROR_COPY.error_inference`, which is intentional (same locked copy, two different trigger paths).
  - [x] Reset `errorMessage` to `undefined` whenever a new attempt starts (`trigger()`) or the reupload flow returns to idle (`retry`/`onSaved`), so a stale message from a previous failure never lingers into a new failure of a different kind.
- [x] Re-open the Selfie Upload control inline for "Try another photo" (AC: 4, 5)
  - [x] Add an optional `onSaved?: () => void` prop to `SelfieUploadForm.tsx` (`app/components/SelfieUploadForm.tsx`), invoked at the same point the form already sets its own `"Selfie saved."` success message, after `setProfile(result.data.profile)`. Purely additive — omitting the prop (as `app/profile/page.tsx`'s existing usage does) preserves today's exact behavior byte-for-byte.
  - [x] Add a new `initialProfile: { email: string; selfieUrl: string | null; updatedAt: string | null }` prop to `VtoStylist.tsx` (the same shape `SelfieUploadForm` already expects — `ProfileView` from `lib/services/profile.ts` is a structural superset, so `app/stylist/page.tsx` can pass its existing `profile` value through as-is without picking fields).
  - [x] Update `app/stylist/page.tsx` to pass `initialProfile={profile}` into `<VtoStylist>` alongside the existing `initialTrend`/`initialGender`/`trends` props. `profile` is already resolved there via `getMyProfile()` — no new data fetch.
  - [x] Add a new `Phase` value `"reupload"` to `VtoStylist.tsx`'s state machine (`"idle" | "pending" | "success" | "error" | "reupload"`). The existing "Try another photo" button's `onClick` currently calls `retry()` (which clears timers and jumps straight to `"idle"`); change it to a new handler that clears timers and sets `phase("reupload")` instead. Render `<SelfieUploadForm initialProfile={initialProfile} onSaved={() => setPhase("idle")} />` when `phase === "reupload"`. Do not touch `gender`/`initialTrend` state anywhere in this flow — leaving them alone is what satisfies AC5 (nothing to re-derive; they were never cleared to begin with).
  - [x] No new component is created — this reuses `SelfieUploadForm` exactly as Story 2.2 built it, matching `EXPERIENCE.md`'s explicit instruction that the inline error component "re-opens the Selfie Upload control" rather than building a second uploader. Do not add a "cancel/back without saving" affordance — out of scope for this story's ACs and consistent with the hackathon-scope minimalism already established elsewhere (e.g. no cancel action on the VTO polling state either, per `EXPERIENCE.md`).
- [x] Add and run verification (AC: 1-7)
  - [x] Extend `lib/services/__tests__/vtoTask.test.tsx`'s `getVtoTaskStatus` describe block: for each of the five mapped codes, assert `getTaskStatus` returning `{ status: "error", errorCode: <code> }` produces `{ taskId, status: "error", message: <exact locked string> }` with no `errorCode` property on the result. Add a case for `invalid_parameter` asserting the returned `message` equals the `error_inference` string exactly, and that `console.error` was called (spy it) with a code-bearing payload. Add a case for an unmapped/unknown code (e.g. `"something_new"`) asserting the same `error_inference` fallback. Update the existing "persists and returns an error transition" test, which currently asserts `errorCode: "error_no_face"` on the result — change that assertion to the new `message`-shaped result (the `updateTaskStatus` mock call assertion, which persists the raw code, stays unchanged).
  - [x] Extend `app/components/__tests__/VtoStylist.test.tsx`: mock a poll response with `status: "error", message: "<one of the five strings>"` and assert that exact text renders (not the generic fallback) — pick a non-`error_inference` string (e.g. the `error_no_face` copy) so the assertion can't accidentally pass against the old generic-fallback behavior. Assert the existing 90-second-timeout test still renders `GENERIC_ERROR_COPY` unchanged (regression coverage — this path has no message to look up). Add a test that clicking "Try another photo" renders the `SelfieUploadForm` (e.g. by its "Add/change photo" label) in place of the error message. Add a test that, after mocking a successful `/api/upload` response inside that re-opened form and submitting it, the screen returns to the idle trigger state (trigger button visible again) — do this without re-selecting gender, asserting the previously selected radio (if a gender selector was involved) or the trigger button's enabled state reflects that the prior selection was preserved.
  - [x] Extend `app/components/__tests__/SelfieUploadForm.test.tsx` with one small test that `onSaved` fires after a successful submit when the prop is supplied, and confirm the existing tests (which never pass `onSaved`) are unaffected by the additive change — no edits needed to those, just re-run them.
  - [x] Run `npm test`, `npm run lint`, `npm run build`. No live YouCam call is needed for this story — Story 2.3 already proved the real `error_download_image` shape end-to-end; this story is pure mapping/UI on top of a contract Story 2.3 already validated live. If a quick live check is still wanted, the fastest real repro is intentionally uploading a non-face photo as the selfie (triggers a genuine `error_no_face` for free — no extra unit cost beyond the one VTO call already being tested).

## Dev Notes

### Developer context and scope

- This story exists entirely to remove a deliberate placeholder Story 2.3 left behind: `VtoStylist.tsx`'s error branch currently renders one hardcoded generic message (`GENERIC_ERROR_COPY`) for every failure, and `lib/services/vtoTask.ts` stores/returns the raw YouCam `errorCode` without ever mapping it to user-facing copy. Story 2.3's own Dev Notes state this explicitly: *"Do not add the AD-6 error-code-to-copy map here — epics.md Story 2.4 owns that... This story stores/returns the raw YouCam errorCode only; 2.4 will extend this same file with the mapping."*
- Scope is narrow and explicit per epics.md: "this story only adds the error-copy map and inline UI — no new collections." Do not touch Story 2.5's territory (Buy Now links) or revisit anything about task creation/polling mechanics that already works.
- The five locked strings are final content from `EXPERIENCE.md` (itself sourced from PRD FR-06) — do not rewrite, rephrase, or add exclamation points/hype-register language to any of them, even though the rest of this app's copy is loud. `EXPERIENCE.md`'s Voice and Tone section is explicit that error copy is a deliberate register break from the hype voice used elsewhere (feed, badges, CTAs): "the moment something needs the user to *do* something correctly... hype language reads as tone-deaf and erodes trust exactly when clarity matters most."

### The locked copy map (verbatim — copy exactly, including punctuation)

| Error code | Locked copy |
|---|---|
| `error_no_face` | "We couldn't detect a face — try a front-facing selfie with good lighting." |
| `error_download_image` | "We couldn't load one of the images — please try uploading again." |
| `error_inference` | "Something went wrong generating your preview — please try again." |
| `error_nsfw_content_detected` | "This image can't be used — please choose a different photo." |
| `exceed_max_filesize` | "That image is too large (max 10MB) — please choose a smaller file." |
| `invalid_parameter` | *(not in the map — falls through to the `error_inference` string above; logged server-side only, AC3)* |

[Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Voice and Tone, lines 62-73]

### Architecture compliance

- AD-6 (`ARCHITECTURE-SPINE.md` line 75): "Every YouCam error code maps to fixed handling in exactly one place (a co-located map in `lib/services/vtoTask.ts`). All codes except `invalid_parameter` render inline on the same screen (never a modal), with a retry action that re-opens the upload control. `invalid_parameter` is logged server-side only... and surfaces to the user as the same generic `error_inference` copy." This story is a direct, literal implementation of that rule — the map's location (`vtoTask.ts`, not the route, not the component) is non-negotiable per this AD.
- NFR5 (epics.md line 33) restates the same contract at the requirements level — cross-reference only, no new information.
- AD-3 (ownership, 404-not-403) and AD-1 (server-only external calls) are unaffected by this story — nothing here changes the auth/ownership boundary or adds new external calls. `getVtoTaskStatus`'s existing `requireAuthenticatedUser()` and ownership check stay exactly as Story 2.3 built them.
- Layered paradigm unchanged: the copy map is resolution logic, so it belongs in the service layer (`lib/services/vtoTask.ts`), not the Route Handler (`app/api/vto-tasks/[id]/route.ts`, which is a pure pass-through today and needs zero changes — verified by reading it: it just does `Response.json({ data: task })`) and not the client component (which must not need any knowledge of YouCam's code vocabulary at all after this story — it only ever sees `message`).

### Existing files to preserve / current state (read before editing)

- `lib/services/vtoTask.ts` (UPDATE): current `VtoTaskView` is `{ taskId: string; status: "pending" | "success" | "error"; resultUrl?: string; errorCode?: string }`. The `errorCode` field is being replaced by `message` on the error path only — `resultUrl` (success path) and the `toView()` helper (used for already-terminal tasks returned from Mongo, and for the still-pending case) both need to keep working, including for tasks whose `errorCode` was already persisted by a task that failed before this story shipped (i.e. `toView()`'s error branch must also resolve `errorCode` → `message` via the same map, not just the fresh-poll branch in `getVtoTaskStatus`'s success/error handling — check `toView()`'s current unconditional `errorCode: task.errorCode` line and update it too, or the map won't apply to a task that was already in a terminal `error` state on a page reload).
- `app/components/VtoStylist.tsx` (UPDATE): full current implementation already read in full during this story's creation — see the Tasks above for the exact lines being changed (`poll()`'s response type and error branch, the error-phase JSX block, the "Try another photo" button's `onClick`). Everything else (the `idle`/`pending`/`success` phases, the gender selector, the trend picker, the polling/timeout timers) is unchanged and must keep passing its existing Story 2.3 tests unmodified.
- `app/components/SelfieUploadForm.tsx` (UPDATE): current props are `{ initialProfile: { email, selfieUrl, updatedAt } }` only, no callback prop exists yet. It manages its own `pending`/`error`/`message` state internally and calls `/api/upload` directly — this story does not change any of that internal behavior, only adds one optional callback fired on success. `app/profile/page.tsx`'s existing usage (`<SelfieUploadForm initialProfile={...} />`, no second prop) must keep behaving identically.
- `app/stylist/page.tsx` (UPDATE): already resolves `profile` via `getMyProfile()` and already redirects away (to `/profile`) if `profile.selfieUrl` is null before `VtoStylist` ever renders — so by the time `VtoStylist` mounts, `initialProfile.selfieUrl` is guaranteed non-null on first render. It only changes state locally afterward if the user goes through the new reupload flow, which is expected and fine (the user replacing their selfie is exactly what the loop is for). One-line change: thread `profile` through as a new prop.

### Interaction and edge-case notes

- **Why the client no longer sees any raw `errorCode` at all, not just for `invalid_parameter`:** AD-6's stated purpose is preventing "ad hoc, inconsistent error UI per call site." If the client still received the raw code for the five mapped errors and did its own lookup, a second, inconsistent copy of `ERROR_COPY` would eventually get built in the client and drift from the server's version. Resolving server-side and sending only the final `message` string makes drift structurally impossible — there is exactly one map, and the client is a dumb renderer of whatever string it's given. This is a stronger reading of AD-6 than the minimum epics.md AC text requires (which only explicitly calls out `invalid_parameter` as needing server-side-only handling), but it is the more defensible interpretation of "fixed handling in exactly one place" and costs nothing extra to implement.
- **`GENERIC_ERROR_COPY` and `ERROR_COPY.error_inference` are the same string on purpose.** They serve different code paths (client-side give-up vs. server-resolved YouCam error) but must never visually or textually diverge for the user, so keep them as two separately-named constants with identical values rather than trying to share one constant across the client/service boundary (which would require exporting from a server-only-safe location — not worth the coupling for a single literal string).
- **The reopened `SelfieUploadForm` uploads to the same `/api/upload` → `user_profiles` destination as Story 2.2's own Profile screen.** Nothing about the upload path is VTO-specific; re-triggering the VTO task afterward is a completely separate action (the existing "Try It On" button in the `idle` phase) that the user takes manually. This story does not auto-retrigger the VTO call after a successful reupload — the user reviews their trend/gender selection (already preserved, AC5) and taps the trigger themselves, consistent with there being no "auto-retry" concept anywhere else in this app.
- **Unknown/future error codes:** `getTaskStatus` in `lib/external/youcam.ts` (Story 2.3) already tolerates a `data.error` shape it can't fully parse by falling back to `"error_inference"` at the client boundary (see its own comment). This story's `ERROR_COPY` fallback is a second, independent safety net one layer up — belt-and-suspenders, not redundant, since `lib/external/youcam.ts` could theoretically pass through some other literal string YouCam introduces later.

### Testing requirements

- Jest + React Testing Library, co-located `__tests__/`, `.test.tsx` naming — same convention every story so far.
- No new mocking infrastructure needed: `lib/services/__tests__/vtoTask.test.tsx` already mocks `@/lib/external/youcam` and `@/lib/data/vtoTasks`, so simulating each error code is just varying the mocked `getTaskStatus` resolved value already used in the existing "persists and returns an error transition" test.
- `console.error` spying for the `invalid_parameter` case: use `jest.spyOn(console, "error").mockImplementation(() => {})` (matching the pattern implied by the project's existing `correlationId`/`errorClass` logging convention in `app/api/upload/route.ts` and `app/api/vto-tasks/[id]/route.ts`) and restore it after the test.
- This story does not need a real YouCam call to be correct (it's pure mapping over a contract Story 2.3 already validated live) — the optional `error_no_face` live repro noted in the Testing task is a nice-to-have, not a blocker, since it costs a real unit and the mapping logic is fully covered by mocked unit tests.

### Previous story intelligence

- Story 2.3 (`lib/services/vtoTask.ts`, `app/components/VtoStylist.tsx`) is the direct, immediate predecessor this story extends — not a new subsystem. Its Dev Notes explicitly flagged this exact handoff (quoted above). Read Story 2.3's Debug Log before starting: it documents a real, confirmed live shape for a YouCam error response (`{ data: { error: "error_download_image", results: null, task_status: "error" } }`, a plain string code, not a nested object) — `lib/external/youcam.ts`'s `getTaskStatus` already normalizes this correctly into `{ status: "error", errorCode: string }`, so this story's `ERROR_COPY` lookup can assume `errorCode` is always a plain string, never an object, by the time it reaches `vtoTask.ts`.
- Story 2.3's code review/self-review caught a stale-closure class of bug in `VtoStylist.tsx`'s async poll callbacks (state reads/writes across `setInterval` ticks) — the same file is being touched again here (`errorMessage` state added alongside `phase`/`resultUrl`). Follow the same discipline already established there: functional `setState` updaters wherever a callback needs the latest value, which the existing `poll()`/`trigger()` functions already do consistently — match that pattern for the new `errorMessage` state rather than introducing a different style.
- Story 2.2's `SelfieUploadForm.tsx` code review history (referenced in Story 2.3's own Dev Notes) has no outstanding issues relevant here; the component is stable and this story's only change to it is one small additive prop.

### Project Structure Notes

Expected story footprint — every file already exists from Story 2.2/2.3; this story only updates, it creates nothing new:

```text
app/
  stylist/
    page.tsx                            # UPDATE: pass `initialProfile={profile}` through to VtoStylist
  components/
    VtoStylist.tsx                      # UPDATE: error-message state, reupload phase, resolved copy rendering
    SelfieUploadForm.tsx                # UPDATE: optional onSaved callback prop
    __tests__/
      VtoStylist.test.tsx               # UPDATE: per-code copy, reopened-upload flow, timeout regression
      SelfieUploadForm.test.tsx         # UPDATE: onSaved coverage
lib/
  services/
    vtoTask.ts                          # UPDATE: ERROR_COPY map, VtoTaskView.message, invalid_parameter server-side log
    __tests__/vtoTask.test.tsx          # UPDATE: per-code assertions replacing the errorCode-shaped assertion
```

No changes anywhere in `lib/data/`, `lib/external/`, or either Route Handler — this story is entirely a service-layer mapping change plus a client-side rendering/reuse change.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: VTO Failure Handling]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR5]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#AD-6 — VTO failure handling contract]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Voice and Tone, Component Patterns (Inline error component row)]
- [Source: _bmad-output/implementation-artifacts/2-3-ai-virtual-try-on-generation.md — Dev Notes ("Do not add the AD-6 error-code-to-copy map here"), Debug Log (confirmed live YouCam error shape), File List]
- [Source: lib/services/vtoTask.ts, app/components/VtoStylist.tsx, app/components/SelfieUploadForm.tsx, app/stylist/page.tsx, app/api/vto-tasks/[id]/route.ts — all read directly in full during this story's creation]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

- Add the single server-side AD-6 error map and return resolved messages without exposing raw provider codes.
- Extend the existing VTO client state machine with terminal-error message state and an inline `SelfieUploadForm` reupload phase, while preserving Story 2.3 same-task connection retry.
- Prove mapped/fallback/logging behavior and the complete reupload loop with isolated Jest/RTL tests before running full regression, lint, and build gates.

### Debug Log References

- 2026-08-18: Resolved an AC4 conflict with the approved Story 2.3 review patch and `EXPERIENCE.md`: polling timeout/lost-connection failures retain the existing task and use same-task `Retry`; only terminal YouCam `error` results expose `Try another photo` and reopen the uploader inline. User approved preserving Story 2.3 behavior.

### Completion Notes List

- Added the five locked AD-6 messages in `lib/services/vtoTask.ts`; fresh and persisted terminal errors resolve through the same map, unknown codes fall back safely, and `invalid_parameter` is logged server-side with correlation context.
- Tightened the public VTO task view so raw YouCam error codes remain in Mongo for operations but never cross to the browser.
- Added exact server-message rendering and reused `SelfieUploadForm` inline for terminal VTO failures. Successful replacement returns to the existing trend/gender trigger state.
- Preserved the approved Story 2.3 contract: connection failures and the 90-second timeout retry the same task instead of reopening the uploader or creating a new billable task.
- Verified 34 Jest suites / 245 tests, ESLint, TypeScript, and the Next.js 16.3.1 production build. No live YouCam units were consumed.

### File List

- `app/components/SelfieUploadForm.tsx`
- `app/components/VtoStylist.tsx`
- `app/components/__tests__/SelfieUploadForm.test.tsx`
- `app/components/__tests__/VtoStylist.test.tsx`
- `app/stylist/page.tsx`
- `lib/services/vtoTask.ts`
- `lib/services/__tests__/vtoTask.test.tsx`
- `_bmad-output/implementation-artifacts/2-4-vto-failure-handling.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-18: Implemented locked VTO failure copy, server-only error-code resolution/logging, inline selfie replacement, and state-preserving return to retry-ready UI; verified full tests, lint, and production build; advanced to review.
