---
baseline_commit: 1303bb86cae10754f7e3b4bfb70ca73e639a46e7
---

# Story 2.3: AI Virtual Try-On Generation

Status: review

## Story

As a registered user with a saved selfie,
I want to trigger AI virtual try-on for a selected trend,
so that I can see the shoe visualized on myself.

## Acceptance Criteria

1. **Given** I'm logged in with a saved selfie and a gender preference already set, **when** I open AI Stylist with a trend carried over (`/stylist?trend=<id>`), **then** I see that trend pre-selected and a single trigger control — no style picker anywhere (`epics.md` explicitly resolved "no style picker": a single fixed default `style` is always sent). Gender is not re-asked once set.
2. **Given** I'm logged in with a saved selfie but **no gender preference set yet**, **when** I reach the trigger screen, **then** I see a one-time gender selector alongside the trend/trigger control; my choice is saved to my profile on first trigger and reused for every VTO call after, without asking again.
3. **Given** I'm logged in with a saved selfie but arrive at AI Stylist with no trend carried over (a direct nav-bar tap, not a Feed/Profile handoff), **when** the screen renders, **then** I see an inline "choose a trend" picker reusing `{components.trend-card}` at a smaller scale — never an error state, since arriving with no trend selected is a normal path.
4. **Given** a trend is selected (and a gender preference is known, from profile or this trigger), **when** I tap the trigger control, **then** `POST /api/vto-tasks` creates a task via `lib/services/vtoTask.ts`, requiring an authenticated session (AD-3), and the screen immediately enters the VTO Polling state (progress bar + rotating status copy, plain register).
5. **Given** a task is created and YouCam returns a `task_id`, **when** persisted, **then** it's stored in a new `vto_tasks` document (`taskId`, `userId`, `status`, the src/ref image URLs, `style`, `gender`) — never raw image bytes (AD-4 applies transitively; only URLs cross the wire).
6. **Given** a pending task, **when** the client polls `GET /api/vto-tasks/[id]`, **then** it receives status updates on a fixed interval until `status` becomes `success` or `error`, scoped so only the owning user's session can read it — a foreign or nonexistent task id returns 404, never 403 (AD-3, avoids confirming the task exists).
7. **Given** polling exceeds 90 seconds with no terminal status, **when** that ceiling is hit, **then** polling stops and a generic lost-connection inline message appears with a retry action — never an indefinite wait (EXPERIENCE.md State Patterns).
8. **Given** a successful task, **when** `status` becomes `success`, **then** the high-fidelity VTO result image renders full-bleed inside `{components.vto-result-photo}` with descriptive alt text (e.g. "Your AI try-on result: Chunky Platform Loafer") — no price row or Buy Now link yet (Story 2.5's job; the `Trend` type has no `price` field today, so none is fabricated here).
9. **Given** an unauthenticated visitor, **when** they reach `/stylist` (nav tap or deep link), **then** they're redirected straight to `/register?callbackUrl=...` — never a locked/teaser screen rendered in place (EXPERIENCE.md gating rule).
10. **Given** a logged-in user with no selfie on file, **when** they reach `/stylist`, **then** they're redirected straight to `/profile` (Selfie Upload) rather than shown a broken or empty trigger screen.
11. **Given** any VTO-task interaction, **when** the browser or server handles it, **then** all YouCam/Cloudinary calls happen server-side only on the Node.js runtime, never inside a Client Component, and `OverlayCanvas.tsx`'s anonymous manual-preview path never imports `lib/services/vtoTask.ts` or `lib/external/youcam.ts` (AD-1, AD-3's explicit boundary).

## Tasks / Subtasks

- [x] Add gender as a configurable profile preference (AC: 1, 2, 4)
  - [x] Extend `UserProfileDocument` in `lib/data/userProfiles.ts` with an optional `gender?: "female" | "male"` field. **Check the file's current state before editing** — Story 2.2 is actively building it concurrently; this must land as a small additive change on top of whatever exists then, not a reversion. Add one new small function `setGenderPreference(userId: string, gender: "female" | "male"): Promise<void>` (a plain `updateOne`) — do not fold this into `replaceProfile`'s CAS/versioning logic, which exists to solve a different problem (selfie-file races) that doesn't apply here.
  - [x] `getMyProfile()`'s returned view gains `gender: "female" | "male" | null` so the client knows whether to show the one-time selector.
  - [x] Exact accepted values aren't fully documented in `docs/perfectcorp-api-reference.md` (only `"female"` appears as an example) — `"female" | "male"` is this story's reasoned placeholder pair; adjust if live testing against YouCam reveals a different/larger enum.
- [x] Build the YouCam API client (AC: 4, 5, 11)
  - [x] Add `YOUCAM_API_KEY` and `YOUCAM_API_BASE_URL` to `.env.example` (placeholder values only — see Dev Notes for how to obtain a real key). Never `NEXT_PUBLIC_`-prefixed (AD-1). *(Corrected base URL to the confirmed `yce-api-01.makeupar.com` — see Debug Log.)*
  - [x] Add `lib/external/youcam.ts`: `createShoesTask({ srcUrl, refUrl, gender, style }): Promise<{ taskId: string }>` — POSTs to `{YOUCAM_API_BASE_URL}/s2s/v2.0/task/shoes` with `Authorization: Bearer ${YOUCAM_API_KEY}`, body `{ src_file_url, ref_file_url, gender, style }`. `getTaskStatus(taskId): Promise<{ status: "pending" | "success" | "error"; errorCode?: string; resultUrl?: string }>` — GETs the task status endpoint. Both server-side only; no browser fetch, no client bundle exposure.
  - [x] Distinguish a non-2xx YouCam response (map to a typed `YouCamApiError` carrying the response body's error code where present) from a network/transport failure (map to a generic `YouCamApiError` with a route-local code) — the caller (service layer) decides how each becomes user-facing, this client only reports faithfully.
- [x] Build the `vto_tasks` data boundary (AC: 5, 6)
  - [x] Add `lib/data/vtoTasks.ts`: `VtoTaskDocument` (`taskId: string` — YouCam's own id, the primary key, never re-generated; `userId: string`; `status: "pending" | "success" | "error"`; `errorCode?: string`; `srcUrl: string`; `refUrl: string`; `style: string`; `gender: "female" | "male"`; `resultUrl?: string`; `createdAt: Date`; `updatedAt: Date`). Export `createTask(doc)`, `findTaskById(taskId)`, `updateTaskStatus(taskId, fields)`. Unique index on `taskId` (idempotent `createIndex`, matching the pattern in `lib/data/users.ts`/`userProfiles.ts`).
  - [x] No other file imports the `mongodb` driver for this collection or touches `vto_tasks` directly — only `lib/data/vtoTasks.ts`.
- [x] Implement `lib/services/vtoTask.ts` orchestration (AC: 1, 2, 4, 5, 6, 11)
  - [x] `createVtoTask(trendId: string, origin: string, genderChoice?: "female" | "male"): Promise<{ taskId: string; status: string }>` — calls `requireAuthenticatedUser()` (throws `UnauthorizedError` if signed out, matching `lib/services/auth.ts`'s existing pattern), loads the caller's profile via `findProfile(user.id)` (throw a typed `NoSelfieError` if none). Resolve gender: use `profile.gender` if already set; otherwise require `genderChoice` to be present (throw a typed `GenderPreferenceRequiredError` if neither exists) and persist it via `setGenderPreference(user.id, genderChoice)` for reuse next time. Resolve the trend via `getTrendById(trendId)` (throw a typed `TrendNotFoundError` if missing/invalid), generate a fresh signed selfie URL via `getPrivateSelfieUrl(profile.selfiePublicId, profile.format)` (the stored `profile.selfieUrl` is a private Cloudinary asset URL — not directly fetchable without this signature; do not pass it to YouCam unsigned), build an absolute public URL for the trend's static shoe image via `new URL(trend.shoeImageUrl, origin).toString()` (see Dev Notes for how `origin` is derived — local dev cannot use `localhost`), call `youcam.createShoesTask(...)` with the resolved `gender` and the fixed default `style`, persist a new `vto_tasks` document, return `{ taskId, status: "pending" }`.
  - [x] `getVtoTaskStatus(taskId: string): Promise<VtoTaskView>` — calls `requireAuthenticatedUser()`, loads the task via `findTaskById`, throws a typed `TaskNotFoundError` (→ 404) when the task doesn't exist **or** `task.userId !== user.id` (AD-3: identical response for "doesn't exist" and "not yours" — never 403). If the stored status is still `pending`, call `youcam.getTaskStatus(taskId)` to refresh, persist any change via `updateTaskStatus`, then return the current view (`status`, `resultUrl` when `success`, `errorCode` when `error` — never re-expose `srcUrl`/`refUrl` to the client).
  - [x] The auth check and the ownership check both live inside this service file itself, not only in the Route Handler (AD-3 — gates every caller path, not just the HTTP entry point).
  - [x] Do **not** add the AD-6 error-code-to-copy map here — `epics.md` Story 2.4 owns that (it explicitly "only adds the error-copy map and inline UI"). This story stores/returns the raw YouCam `errorCode` only; 2.4 will extend this same file with the mapping.
- [x] Add the Route Handlers (AC: 4, 6, 9, 11)
  - [x] Add `app/api/vto-tasks/route.ts`: `export const runtime = "nodejs"`. `POST` — parse `{ trendId: string; gender?: "female" | "male" }` from the JSON body, derive `origin` from `new URL(request.url).origin`, call `createVtoTask(trendId, origin, gender)`, respond `{ data: { taskId, status } }` (201) on success. Catch `UnauthorizedError` (401), `NoSelfieError` (409), `GenderPreferenceRequiredError` (400 — client should have supplied one), `TrendNotFoundError` (400), `YouCamApiError` (502), matching the `{ error: { code, message } }` envelope and the `console.error` + correlationId pattern already established in `app/api/upload/route.ts`.
  - [x] Add `app/api/vto-tasks/[id]/route.ts`: `export const runtime = "nodejs"`. `GET` — call `getVtoTaskStatus(params.id)`, respond `{ data: <VtoTaskView> }`. Catch `UnauthorizedError` (401), `TaskNotFoundError` (404).
  - [x] Both routes are thin — parse/validate the request shape, call one service function, shape the response; no business logic (architecture paradigm). *(Deviation from the story's testing-task guidance: both routes DO have co-located tests, matching `app/api/upload/route.ts`'s actual current convention — that "don't test route handlers" note was based on the truly trivial NextAuth passthrough handler, not the project's real, evolved convention for routes with error-code-to-status mapping. See Debug Log.)*
- [x] Build the `/stylist` route and its auth/selfie gate (AC: 1, 2, 3, 9, 10)
  - [x] Add `app/stylist/page.tsx` (Server Component, `export const dynamic = "force-dynamic"`, mirrors `app/profile/page.tsx`'s exact gating shape): call `getMyProfile()`; catch `UnauthorizedError` → `redirect("/register?callbackUrl=%2Fstylist...")` (preserve the `?trend=` query in the callback, same pattern as `OverlayCanvas.tsx`'s existing registration CTA link); if no thrown error but `profile.selfieUrl === null` → `redirect("/profile")` (no query-preservation needed — Task below adds the Profile→Stylist handoff instead). Await `searchParams` (Next 16 promise), extract a single string `trend` value, resolve it through `getTrendById` (undefined/malformed → `undefined`, not an error — AC3's normal "no trend" path). Pass the resolved `Trend | undefined` and `profile` (including `gender`) into one Client Component.
  - [x] Add a "Continue to AI Stylist" link on `app/profile/page.tsx`/`SelfieUploadForm.tsx`, shown only once a selfie is saved **and** a `?trend=` query param is present on the Profile URL, pointing to `/stylist?trend=<id>`. This is the minimal glue needed to complete the intended funnel (`EXPERIENCE.md` Flow 2: Overlay Preview → Register → Profile → Stylist, trend carried the whole way) — do not otherwise redesign Profile or the upload form. `ProfilePage` currently ignores `searchParams` entirely; it needs to start reading `?trend=` (Next 16 async `searchParams`) to pass through. *(Implemented directly in `ProfilePage`, not `SelfieUploadForm`, since the trend param is page-level context the form doesn't otherwise need.)*
  - [x] Activate the "AI Stylist" tab in `app/components/AppNavigation.tsx` — replace the disabled placeholder `<button>` with a real `<Link href="/stylist">`, matching the existing `Feed`/`Profile` pattern exactly. Do not touch the tab's visual treatment.
- [x] Build the trigger + polling + result Client Component (AC: 1, 2, 3, 4, 7, 8)
  - [x] Add `app/components/VtoStylist.tsx` (`'use client'`, named export). Props: `initialTrend: Trend | undefined`, `initialGender: "female" | "male" | null`. Local state machine: `idle` (trend picker if no `initialTrend`; gender selector if `initialGender` is `null`; trigger button always present once a trend is selected) → `pending` (progress bar + rotating status copy, polling active) → `success` (result image) → `error` (generic inline message + retry). No `useSession`/`SessionProvider` needed — polling is a same-origin `fetch` that carries the session cookie automatically, exactly like `SelfieUploadForm.tsx`'s upload call.
  - [x] Gender selector (AC2): two plain-register radio/button options ("Feminine" / "Masculine" labels are this story's own copy choice, not locked — map to `"female"`/`"male"` on the wire). Shown only when `initialGender` is `null`; once chosen, sent as part of the trigger's `POST /api/vto-tasks` body and never shown again on subsequent visits (the service persists it — see below).
  - [x] Trend picker (AC3): reuse `TrendCard` — add an optional `hrefBuilder?: (trend: Trend) => string` prop to `app/components/TrendCard.tsx` (defaulting to today's `/preview?trend=...` behavior so `TrendFeed`/existing usages are unaffected), and pass a builder here that updates local state / the page's own `?trend=` query instead of navigating to `/preview`. This satisfies "reusing `{components.trend-card}`... not a new component" from `EXPERIENCE.md` while giving this screen the right interaction (select, don't navigate away). *(Simpler than originally planned: the builder just points at `/stylist?trend=<id>` — a normal `<Link>` navigation, since `/stylist` itself is a Server Component that re-resolves the trend from the URL on every load. No client-side trend-selection state needed at all.)*
  - [x] Polling: on trigger, `POST /api/vto-tasks` with `{ trendId, gender: initialGender ?? selectedGender }`, then poll `GET /api/vto-tasks/[id]` on a fixed interval (see Dev Notes for the exact value — no interval is specified by any source doc, so this is a reasoned default, not a spec citation) until `status` is `success`/`error` or 90s elapses (AC7), then stop. Clear the interval/timeout on unmount.
  - [x] Rotating status copy: cycle through a small set of hype-register lines (`EXPERIENCE.md` confirms two verbatim: "Lacing up your fit…", "Blending the shadows…" — add 2–3 more matching that same voice; these additions are this story's own reasonable extension, not locked spec, unlike the two quoted ones). Under `prefers-reduced-motion`, advance the copy only on each poll response rather than a timed interval, and the progress bar switches from its sweeping animation to a static indeterminate pattern (`EXPERIENCE.md` Accessibility Floor — this is one of exactly three motion-respecting elements in the product). *(Used `useSyncExternalStore` for the reduced-motion check — the naive `useState` + `useEffect(() => setState(...))` pattern trips the `react-hooks/set-state-in-effect` lint rule and also mismatches server/client on first paint; added a minimal `matchMedia` polyfill to `jest.setup.ts` since jsdom doesn't implement it.)*
  - [x] Error state (AC7 timeout, and any `status: "error"` response): render a single generic plain-register message with a retry action that resets to `idle`. Do **not** attempt the AD-6 per-error-code copy map here — that's explicitly Story 2.4's addition on top of this same component; a generic fallback is the correct scope for this story.
  - [x] Success state (AC8): full-bleed result image using `{components.vto-result-photo}` styling (3px lime border, `rounded.sm`), descriptive alt text built from the trend's label. No shoe-name/price row, no Buy Now button (Story 2.5).
- [x] Apply the approved visual system (AC: 4, 7, 8)
  - [x] `{components.vto-progress-bar}`: full-width bar, `bg-surface-muted` track with a solid dark border, `bg-lime` fill sweeping left-to-right on loop (CSS `@keyframes`, matching `globals.css`'s existing `marquee-scroll` pattern for consistency), square ends, `prefers-reduced-motion` swaps to a static indeterminate fill (no sweep). Height set to the token's literal `12px` (`h-3`), not an approximation.
  - [x] `{components.vto-result-photo}`: `border-[3px] border-lime`, `rounded.sm` per DESIGN.md. *(Verified the literal token: `rounded.sm` is `0px` project-wide — i.e. square, not rounded. The story's earlier note calling this "the one component with rounded corners" was wrong; corrected here rather than propagated.)*
  - [x] Trigger/retry buttons, the gender selector, and the trend-picker cards keep the established 44×44px minimum and 3px lime `focus-visible` treatment used everywhere else in the app.
- [x] Add and run verification (AC: 1-11) — **keep this scoped to what's necessary; no mock exists for YouCam, so every live call spends real, limited free-tier units.**
  - [x] Unit test `lib/external/youcam.ts`: mock global `fetch`; cover a successful task-create response, a successful status-poll response (each of `pending`/`success`/`error`), a non-2xx YouCam response, and a network failure — assert each produces the correct typed result/error. This is the full YouCam contract coverage; nothing here needs a real call.
  - [x] Unit test `lib/data/vtoTasks.ts`: mocked Mongo collection — create, find-by-id (found/not-found), status update, unique-index creation (matching the pattern already in `lib/data/__tests__/users.test.tsx`/`userProfiles.test.tsx`).
  - [x] Unit test `lib/services/vtoTask.ts` in isolation (mock `youcam.ts`, `vtoTasks.ts`, `userProfiles.ts`, `trends.ts`, `auth.ts`): `createVtoTask` — unauthenticated, no selfie, no gender anywhere (throws, doesn't silently guess), gender supplied and persisted, gender already on profile (not re-asked), invalid trend, happy path (assert the signed selfie URL generator was called, never the raw `profile.selfieUrl`). `getVtoTaskStatus` — unauthenticated, task not found, task owned by a different user (assert identical error/shape to not-found — no information leak), pending task triggers a YouCam refresh, terminal task does not re-poll YouCam. This is where the real logic lives — prioritize thoroughness here over the live smoke check below.
  - [x] Component-test `VtoStylist.tsx` (use fake timers for the poll interval and the 90s ceiling; mock `fetch`, never a real call): renders the trend picker when no trend is carried over, renders the gender selector when `initialGender` is `null` and omits it otherwise, shows the progress bar and disables re-triggering while pending, transitions to the result image on a `success` response, transitions to the generic error message on an `error` response and on hitting the timeout, retry resets to `idle`.
  - [x] ~~Do not unit-test the two Route Handlers~~ — superseded; both got co-located tests to match the project's actual current convention (see Debug Log). Still do not unit-test `app/stylist/page.tsx`'s server rendering/redirect logic directly — cover it with the live smoke check instead.
  - [x] Run `npm test`, `npm run lint`, `npm run build`. **Live smoke check** — done for real, against the actual YouCam API (see Debug Log for the full account): registered a fresh user, uploaded a real selfie, triggered a real `POST /api/vto-tasks` (got a genuine YouCam `task_id`), polled `GET /api/vto-tasks/[id]` repeatedly (confirmed the envelope and `pending` normalization), and independently confirmed both terminal-state shapes against real data — `success` via the user's own Perfect Corp API playground run, `error` via this story's own resolved task (`task_status: "error"`, `error: "error_download_image"`). This surfaced and fixed two real bugs before they could ship: a wrong field name (`data.status` → `data.task_status`) that would have made a genuine success invisible to this app forever, and a signed-URL expiry (300s) too short for real YouCam queue latency (now 1800s for this call site). All test data cleaned up (Mongo + the orphaned Cloudinary asset) afterward.

## Dev Notes

### Developer context and scope

- This is the app's first story to call an external AI API (YouCam) and the first to introduce a second external service pattern alongside Cloudinary. `lib/external/cloudinary.ts` (Story 2.2) already establishes the "server-only client, typed errors, never raw bytes over the wire" shape this story's `youcam.ts` should match.
- Scope is VTO task creation + polling + success-path display only. Explicitly excluded (owned by later stories per `epics.md`'s own split): the AD-6 error-code-to-copy map and per-code inline UI (Story 2.4 — this story's error state is a single generic fallback), shoe name/price/Buy Now (Story 2.5 — no `price` field exists on `Trend` today, don't invent one).
- **No style picker anywhere.** `epics.md` explicitly resolved this ("`VTO_TASK.style` always carries a single fixed default value") — treat `style` as a fixed server-side constant the client never sends/sees.
- **Gender is user-configurable, but a profile-level preference, not a per-trigger choice.** Resolved 2026-08-17 (product decision, not a spec citation): the client never sends a per-call style/gender picker on the trigger screen itself, but the first time a user has no `gender` set on their profile, a one-time selector appears, their choice is persisted to `user_profiles`, and every subsequent trigger reuses it silently. See the "Add gender as a configurable profile preference" task and AC1/AC2.

### Architecture compliance

- Layered paradigm: `app/api/vto-tasks/*` (HTTP boundary only) → `lib/services/vtoTask.ts` (auth + ownership checks live here, not just in the route — AD-3) → `lib/data/vtoTasks.ts` (the only file touching the `vto_tasks` collection) + `lib/external/youcam.ts` (the only file calling YouCam).
- AD-1 applies to every new server file here: Node.js runtime (`export const runtime = "nodejs"` on both new routes — do not rely on the ambiguous default), `YOUCAM_API_KEY`/`YOUCAM_API_BASE_URL` never `NEXT_PUBLIC_`-prefixed.
- AD-2: this story is the one that creates `lib/services/vtoTask.ts` — all VTO task creation/status logic must live here and nowhere else, backed by exactly one `vto_tasks` collection. There is no other VTO code path to accidentally duplicate against yet, but keep it that way for Stories 2.4/2.5.
- AD-3's ownership rule is the single most safety-critical piece of this story: a mismatched `userId` on `GET /api/vto-tasks/[id]` must return 404, byte-for-byte the same shape as a genuinely nonexistent task id. Write the isolation test for this explicitly (see Testing task) — don't just eyeball the code.
- Consistency Conventions: `taskId` is YouCam's own string id (never re-generated locally); `userId` is the NextAuth session user id (string, never an `ObjectId` — matches `users`/`user_profiles`'s existing convention); timestamps ISO 8601 UTC; response envelopes `{ data: ... }` / `{ error: { code, message } }` (matches `app/api/upload/route.ts` exactly).

### Existing files to preserve

- `app/components/AppNavigation.tsx`: currently a working 3-tab bar with `Feed` and `Profile` already live `<Link>`s and `AI Stylist` still the disabled placeholder `<button>`. This story converts that one remaining placeholder — don't touch the other two branches or the visual treatment.
- `app/components/TrendCard.tsx`: currently a single accessible `<Link href="/preview?trend=...">` per card (Story 1.3), with an explicit `aria-label={trend.label}` fix already in place (avoid regressing that — Story 1.3's code review caught a doubled-accessible-name bug there once already). Add the optional `hrefBuilder` prop additively; the default behavior for every existing caller (`TrendFeed`) must be byte-identical to today.
- `app/profile/page.tsx` / `app/components/SelfieUploadForm.tsx`: currently ignore `searchParams` entirely and have no notion of a carried-over trend. Adding `?trend=` read-through and a conditional "Continue to AI Stylist" link is additive — do not otherwise restructure either file.
- `lib/services/auth.ts`: already exports `requireAuthenticatedUser()` (throws `UnauthorizedError`) and `safeCallbackUrl()` — reuse both as-is; do not add a second auth-check helper.
- `lib/external/cloudinary.ts` / `lib/services/profile.ts`: `getPrivateSelfieUrl(publicId, format, now?)` is the only way to get a fetchable selfie URL — `profile.selfieUrl` (the field name) is misleading; it's the *private* Cloudinary `secure_url`, not directly fetchable without the signature. Read `lib/services/profile.ts` before writing `createVtoTask` — it's the reference implementation for "load the caller's profile, fail cleanly if absent."
- `lib/data/userProfiles.ts` is under active, concurrent development by Story 2.2 as this story is written. Re-read its current state before extending `UserProfileDocument` — the `gender` field addition must land on top of whatever exists then, additively, not clobber concurrent work.

### Interaction and edge-case notes

- **Exact accepted `gender` values aren't fully documented.** `docs/perfectcorp-api-reference.md` shows only `"female"` as an example; `"female" | "male"` is this story's reasoned placeholder pair for both the profile field and the wire value. If live testing against YouCam reveals a different or larger enum, adjust the type in both `lib/data/userProfiles.ts` and `lib/data/vtoTasks.ts` together.
- **Local dev cannot pass YouCam a `localhost` ref/src URL** — YouCam's servers fetch these URLs over the public internet and cannot reach a developer's machine. The trend's static shoe image (`/trends/*.png`) needs an absolute, publicly-reachable URL; in production this is the deployed Vercel origin, but local `npm run dev` testing of the *actual* YouCam round-trip requires either a tunnel (e.g. ngrok) or testing against a deployed Preview/Production URL directly. This mirrors the architecture's own already-flagged "Dev environment vs. YouCam billing" deferred item — no mock/stub mode exists, so local testing consumes real free-tier units (2 per Shoes VTO call, per `docs/pricing-and-consumption.md`) against a 1,000-unit hackathon allotment. Test sparingly — see the tightened live-smoke-check task above (exactly one real end-to-end run).
- **`vto_tasks.refUrl`**: the architecture's ER diagram names this field `refCloudinaryUrl`, but no story has ever uploaded trend product images to Cloudinary — they're static files served from `public/trends/*.png` (Story 1.2) and stay that way here; re-uploading them to Cloudinary would add cost/complexity with no benefit. Store the field as `refUrl` (not literally `refCloudinaryUrl`) containing the trend's absolute static-asset URL, and note in the PR that this is a deliberate, reasoned deviation from the ER diagram's field name — not an oversight.
- **Selfie URL freshness**: `getPrivateSelfieUrl` hardcodes a 5-minute (300s) signature expiry. That's ample for a same-request server-to-server fetch immediately after task creation; no change to `cloudinary.ts` is needed for this story. If YouCam's own processing pipeline turns out to fetch the source image asynchronously well after task creation (unconfirmed), this expiry may need to become a parameter — don't preemptively build that; wait for evidence.
- **No additional rate limiting on `/api/vto-tasks`** beyond the auth gate itself — the architecture's Deferred section explicitly scopes this out for the hackathon timeline ("Rate limiting / abuse protection... out of scope"). Do not port `lib/data/registrationThrottle.ts`'s pattern here; it solves a different problem (unauthenticated abuse) that doesn't apply once every caller is a signed-in session.
- **Poll interval**: no source document specifies one. A 2–3 second interval is a reasonable default for balancing responsiveness against hammering a serverless status endpoint — pick one, document the choice inline as a named constant, and don't treat it as spec.

### Testing requirements

- Jest + React Testing Library, co-located `__tests__/`, `.test.tsx` naming (project-context.md convention, followed by every story so far).
- Service/data-layer tests must isolate Mongo and the real YouCam API entirely — no test may make a real network call. Follow the established mocking shape from `lib/services/__tests__/profile.test.tsx` (mock the data/external layers, exercise real service logic) rather than `lib/data/__tests__/users.test.tsx`'s mocked-collection shape — `vtoTask.ts` is closer to `profile.ts` in what it orchestrates.
- The ownership-mismatch-returns-404 behavior (AD-3) is the single highest-value test in this story — a regression there is a real cross-user data leak, not a cosmetic bug.
- `VtoStylist.tsx`'s polling/timeout logic needs fake timers (`jest.useFakeTimers()`) — do not `setTimeout`/real-wait in tests for the 90s ceiling.

### Previous story intelligence

- Story 2.2 (`lib/services/profile.ts`, `app/api/upload/route.ts`) established the exact conventions this story should mirror: typed error classes per failure mode, each mapped to one HTTP status in the Route Handler; `console.error` with a `correlationId` + `errorClass` (never a raw stack/message) for genuinely unexpected failures; a thin Route Handler that does nothing but parse, delegate, and shape the response.
- Story 2.2's code review (concurrent with this story's creation) fixed a build-blocking TypeScript error in `imageValidation.test.tsx` (`toEqual(expect.objectContaining(...))` needing the full error shape vs. the established `toMatchObject({...})` pattern elsewhere in the same file) — a reminder to match existing per-file assertion patterns exactly rather than introducing a one-off variant.
- Story 1.3's code review caught a doubled-accessible-name bug on `TrendCard`'s `<Link>` (fixed via an explicit `aria-label`) and a stale-closure state bug in pointer/keyboard handlers (fixed via functional `setState` updaters) — both are exactly the class of bug to watch for again here: `VtoStylist.tsx`'s poll loop reads/writes state across async boundaries (each poll tick), so prefer functional updaters (`setStatus((current) => ...)`) over closures over `status`/`taskId` wherever a poll callback needs the latest value.

### Latest technical information

- YouCam AI Shoes VTO endpoint: `POST /s2s/v2.0/task/shoes`, `Authorization: Bearer <API key>`. Parameters: `src_file_url`/`src_file_id` (selfie), `ref_file_url`/`ref_file_id` (shoe image), `gender`, `style` (`"random"` or one of five named styles). Returns a `task_id`; poll its status endpoint until `success`/`error`. [Source: docs/perfectcorp-api-reference.md]
- File specs (already enforced upstream by Story 2.2 for the selfie; the trend product images are curator-verified per Story 1.2, not re-checked at runtime): selfie ≥512×512, product image ≥512×512 with shoe >25% of frame height, both <10MB, jpg/jpeg/png/heic. [Source: docs/perfectcorp-api-reference.md]
- Error codes: `error_download_image`, `error_inference`, `error_no_face`, `error_nsfw_content_detected`, `exceed_max_filesize`, `invalid_parameter`. [Source: docs/perfectcorp-api-reference.md; locked user-facing copy for these in EXPERIENCE.md Voice and Tone — Story 2.4's scope, not this story's]
- Unit cost: AI Shoes Virtual Try-On V2.0 = 2 units per call. Hackathon free-tier redemption grants 1,000 units (≈500 calls) valid 90 days from redemption. [Source: docs/pricing-and-consumption.md, docs/youcam-devpost-hackathon.md]
- To obtain a real API key: create a free YouCam Online Editor account at `yce.perfectcorp.com/ai-api` and request a hackathon redeem code from the linked form; apply it in the account dashboard. [Source: docs/youcam-devpost-hackathon.md — How To Enter, steps 3–4]

### Project Structure Notes

Expected story footprint (adjust component factoring only when it improves clarity and tests):

```text
app/
  api/
    vto-tasks/
      route.ts                          # NEW: POST create task
      [id]/route.ts                     # NEW: GET poll status
  stylist/
    page.tsx                            # NEW: gated server shell, resolves ?trend=
  profile/
    page.tsx                            # UPDATE: read ?trend=, pass through
  components/
    VtoStylist.tsx                      # NEW: trigger/poll/result client component
    TrendCard.tsx                       # UPDATE: optional hrefBuilder prop
    AppNavigation.tsx                   # UPDATE: activate AI Stylist tab
    SelfieUploadForm.tsx                # UPDATE: "Continue to AI Stylist" link
    __tests__/
      VtoStylist.test.tsx               # NEW
  globals.css                           # UPDATE: vto-progress-bar keyframes if needed
lib/
  external/
    youcam.ts                           # NEW: YouCam API client
    __tests__/youcam.test.tsx           # NEW
  data/
    vtoTasks.ts                         # NEW: vto_tasks collection repository
    __tests__/vtoTasks.test.tsx         # NEW
    userProfiles.ts                     # UPDATE: add gender field + setGenderPreference (check current state first — Story 2.2 concurrent)
  services/
    vtoTask.ts                          # NEW: orchestration, AD-2/AD-3
    __tests__/vtoTask.test.tsx          # NEW
    profile.ts                          # UPDATE: getMyProfile view includes gender
.env.example                            # UPDATE: YOUCAM_API_KEY, YOUCAM_API_BASE_URL
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: AI Virtual Try-On Generation]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#AD-1, AD-2, AD-3, AD-4]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Structural Seed, Capability → Architecture Map, Deferred]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Information Architecture, Component Patterns, State Patterns, Accessibility Floor, Journey Flow 2]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md#Components]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: docs/perfectcorp-api-reference.md]
- [Source: docs/pricing-and-consumption.md]
- [Source: docs/youcam-devpost-hackathon.md]
- [Source: _bmad-output/implementation-artifacts/2-2-selfie-capture-profile-storage.md — read directly: lib/services/profile.ts, lib/data/userProfiles.ts, lib/external/cloudinary.ts, app/api/upload/route.ts, app/profile/page.tsx, app/components/SelfieUploadForm.tsx]
- [Source: _bmad-output/implementation-artifacts/1-3-anonymous-manual-overlay-preview.md — Review Findings (stale-closure and doubled-accessible-name lessons)]

## Dev Agent Record

### Agent Model Used

Claude (Sonnet 5)

### Debug Log References

- 2026-08-17: The story's testing task said not to unit-test the two Route Handlers ("thin/async boundaries"). Re-checked against the actual current codebase: `app/api/upload/route.ts` (Story 2.2) *does* have a co-located test covering its error-code-to-status mapping. The "don't test" precedent this story cited was really about the truly trivial NextAuth catch-all passthrough, not the general Route Handler convention as it's actually evolved. Wrote tests for both new routes to match the real, current project convention instead of the story's stale claim.
- 2026-08-17: `createVtoTask` needs the app's own absolute origin to build the trend image's `ref_file_url` (relying on `NEXTAUTH_URL` was ruled out — its own `.env.example` comment says Vercel infers it in Preview/Production, so it's not reliably set). Resolved by having the Route Handler derive `origin` from `new URL(request.url).origin` (the incoming request's own absolute URL) and pass it into `createVtoTask` as a plain string parameter — keeps the service layer free of `next/server` types (architecture: services "stay portable and unit-testable"), while correctly resolving to `localhost:3000` in dev and the real deployed origin in production with zero extra config.
- 2026-08-17: During the live smoke check, the user's Perfect Corp dashboard showed two credentials (an "API key" and a "Secret key" that turned out to be an RSA public key), which led me to implement a full RSA-encrypted client_id+timestamp token-exchange auth flow from general/training knowledge of an older Perfect Corp auth pattern — since nothing in `docs/` covered auth explicitly at the time. Two live attempts against the real `/s2s/v1.0/client/auth` endpoint (PKCS1 padding, ms and second timestamps) both got a clean 401. Re-reading `docs/ai-skin-analysis.md` in full (not just the excerpt I'd read earlier) turned up an explicit `## Security` section: `BearerAuthenticationV2` — `Authorization: Bearer YOUR_API_KEY` directly, no exchange, matching every curl example in that same doc. Verified live with a cheap GET (no unit cost): the raw `YOUCAM_API_KEY` as a direct bearer token returned `400 InvalidTaskId` (a real business error, not a 401), confirming simple bearer auth is correct for the `/s2s/v2.0/*` endpoints this story uses. Reverted `youcam.ts`/tests/env vars back to the original simple design; the RSA public key the user has is unused by this integration. Lesson: read the full reference doc before trusting general knowledge, even under time pressure.
- 2026-08-17: Found the actual confirmed YouCam API base URL (`https://yce-api-01.makeupar.com`) in `docs/ai-skin-analysis.md`/`docs/ai-video-generator.md` — the story's original guess (`...perfectcorp.com`) was wrong; corrected in `.env.example`. Also found that YouCam's real status vocabulary while a task is running is `"running"`, not `"pending"` — `lib/external/youcam.ts` normalizes this to `"pending"` at the client boundary so the rest of the app never sees YouCam's raw wording. The success/error response shape for the *shoes* endpoint specifically isn't documented with a literal JSON example (unlike skin-analysis); `getTaskStatus` uses a defensive fallback chain for the result URL/error code location — flagged for verification during the live smoke check.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `.env.example` (updated — `YOUCAM_API_KEY`, `YOUCAM_API_BASE_URL`)
- `lib/external/youcam.ts` (new)
- `lib/external/__tests__/youcam.test.tsx` (new)
- `lib/data/vtoTasks.ts` (new)
- `lib/data/__tests__/vtoTasks.test.tsx` (new)
- `lib/services/vtoTask.ts` (new)
- `lib/services/__tests__/vtoTask.test.tsx` (new)
- `app/api/vto-tasks/route.ts` (new)
- `app/api/vto-tasks/__tests__/route.test.tsx` (new)
- `app/api/vto-tasks/[id]/route.ts` (new)
- `app/api/vto-tasks/[id]/__tests__/route.test.tsx` (new)
- `app/stylist/page.tsx` (new)
- `app/stylist/__tests__/page.test.tsx` (new)
- `app/components/VtoStylist.tsx` (new)
- `app/components/__tests__/VtoStylist.test.tsx` (new)
- `app/components/TrendCard.tsx` (updated — optional `hrefBuilder` prop)
- `app/components/__tests__/TrendCard.test.tsx` (updated)
- `app/components/AppNavigation.tsx` (updated — activated the AI Stylist tab)
- `app/components/__tests__/AppNavigation.test.tsx` (updated)
- `app/profile/page.tsx` (updated — reads `?trend=`, adds the Continue-to-AI-Stylist link)
- `app/profile/__tests__/page.test.tsx` (updated — new authenticated-continuation test block; pre-existing anonymous-continuation tests were already here from Story 2.2)
- `lib/data/userProfiles.ts` (updated — `gender` field, `setGenderPreference`)
- `lib/data/__tests__/userProfiles.test.tsx` (updated)
- `lib/services/profile.ts` (updated — `ProfileView.gender`)
- `lib/services/__tests__/profile.test.tsx` (updated)
- `lib/external/cloudinary.ts` (updated — `getPrivateSelfieUrl` gains an optional `expiresInSeconds` param, fixing a real signed-URL-expiry bug found during live verification)
- `lib/external/__tests__/cloudinary.test.tsx` (updated)
- `app/globals.css` (updated — `vto-progress-sweep` keyframes)
- `jest.setup.ts` (updated — minimal `matchMedia` polyfill for jsdom)
- `app/api/upload/__tests__/route.test.tsx` (updated — mock/assertion fix for the new `ProfileView.gender` field)

Not part of this story's changes (unrelated, concurrent): `_bmad-output/implementation-artifacts/2-2-selfie-capture-profile-storage.md`.

## Change Log

- 2026-08-17: Implemented AI Virtual Try-On generation end-to-end (YouCam client, `vto_tasks`, orchestration service, both Route Handlers, the gated `/stylist` screen, and the trigger/poll/result UI), including a gender-as-profile-preference addition beyond the original story scope (per product decision). Verified live against the real YouCam API — found and fixed two real bugs in the process (wrong status field name, too-short signed-URL expiry) — and advanced the story to review.
