---
baseline_commit: dc42dbaaa699fb1ff3843138e695fad66019546d
---

# Story 2.1: User Registration & Login

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to register and log in with an account,
so that I can access the premium AI Stylist experience.

## Acceptance Criteria

1. **Given** I am anonymous, **when** I visit `/register`, **then** I see one screen with a Sign Up form and a Sign In form, switched by a toggle link — email + password fields only, no OAuth button anywhere (architecture AD-7).
2. **Given** valid Sign Up input (well-formed email, password ≥ 8 characters), **when** I submit, **then** `POST /api/auth/register` hashes the password with `bcryptjs`, creates a `users` document via `lib/data/users.ts` (`id`, `email`, `passwordHash`, `createdAt`), and I am signed in immediately with a session established — no redirect-away step in between.
3. **Given** I submit Sign Up with an email already registered, **when** creation is attempted, **then** no duplicate document is created and I see the inline plain-register message "That email's already registered — sign in instead?"
4. **Given** I submit Sign In with an email that doesn't exist or a wrong password, **when** submitted, **then** I see the generic inline message "Email or password didn't match — try again." — identical for both cases, never revealing which field was wrong (no account enumeration).
5. **Given** I am signed in (Sign Up or Sign In), **when** I navigate the app afterward, **then** my session is available server-side via NextAuth's session helper, backed by `session: { strategy: 'jwt' }` — no database adapter, no OAuth (AD-7).
6. **Given** a Sign Up or Sign In submission is in flight, **when** the round trip is pending, **then** the submit control disables and shows in-progress plain-register copy ("Creating your account…" / "Signing you in…"), preventing a double submit.
7. **Given** any control on the Registration/Login screen, **when** consumed via keyboard or assistive technology, **then** every input has a properly associated `<label>`, the password fields are `type="password"`, focus shows the 3px lime focus ring, and tab order follows visual order.
8. **Given** the architecture's layered boundary, **when** this story is implemented, **then** MongoDB access happens only inside `lib/data/users.ts` (never from a Route Handler or directly from `lib/services/auth.ts`), no NextAuth adapter package is installed, and all secrets (`MONGODB_URI`, `NEXTAUTH_SECRET`) come from environment variables — never hardcoded, never `NEXT_PUBLIC_`-prefixed.

## Tasks / Subtasks

- [x] Provision the shared MongoDB connection (AC: 2, 5, 8)
  - [x] Add `mongodb` `^7.5.0` as a dependency.
  - [x] Add `lib/data/mongodb.ts`: a singleton `MongoClient`, cached on `globalThis` in development to survive Next.js hot-reload (a fresh client per reload exhausts Atlas M0's connection limit), a plain module-level singleton in production. Read `MONGODB_URI` from `process.env`; throw a clear startup error if it is missing — do not silently no-op. Export a `getDb()` helper that reads the database name from `MONGODB_DB_NAME` (architecture: separate `whattheheel_dev`/`whattheheel_prod` names, never hardcoded).
  - [x] Add `.env.example` documenting `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (`http://localhost:3000` for dev) with placeholder values only. Never commit `.env.local`; confirm `.gitignore` already excludes it (it does — verified `.env*` pattern present).
- [x] Build the `users` data boundary (AC: 2, 3, 5, 8)
  - [x] Add `bcryptjs` (`^3.0.3`) as a dependency. Check whether TypeScript reports missing types after install — recent `bcryptjs` ships its own `.d.ts`; add `@types/bcryptjs` only if the build actually complains.
  - [x] Add `lib/data/users.ts`: typed `User` interface (`id: string`, `email: string`, `passwordHash: string`, `createdAt: Date`). Export `findUserByEmail(email)` and `createUser(email, passwordHash)`. Store email lowercased and trimmed for lookup consistency. Create a **unique index on `email`** (idempotent `createIndex` call, e.g. run once from `getDb()`/a users-collection accessor) so a duplicate Sign Up is rejected at the database layer even under a race — do not rely on check-then-insert alone.
  - [x] `createUser` must surface a distinguishable "duplicate email" condition (either a pre-check via `findUserByEmail`, or catching the Mongo `E11000` duplicate-key error) so the caller can produce AC3's copy without leaking which check failed.
  - [x] No other file touches the `users` collection or imports the `mongodb` driver directly — only `lib/data/*`.
- [x] Implement the auth service and NextAuth wiring (AC: 1, 2, 4, 5, 7, 8)
  - [x] Add `next-auth` `4.24.15`. Try a normal `npm install` first; the `--legacy-peer-deps` requirement noted in the architecture was specific to the now-dropped adapter package, so it may no longer be necessary for `next-auth` alone against Next.js 16 — only fall back to the flag if `npm` reports an actual peer conflict. *(Installed cleanly, no flag needed — confirms the story's hypothesis.)*
  - [x] Add `lib/services/auth.ts` exporting NextAuth `authOptions`: one `CredentialsProvider` (`email`, `password` fields), `session: { strategy: 'jwt' }`, `secret: process.env.NEXTAUTH_SECRET`. Its `authorize()` calls `lib/data/users.ts` (`findUserByEmail` + `bcrypt.compare`) and **returns `null` on every failure path** (unknown email, wrong password) — never `throw` — so the client always receives the same generic outcome, satisfying AC4's no-enumeration requirement at the logic layer, not just in the UI copy.
  - [x] Add `app/api/auth/[...nextauth]/route.ts`: thin handler — `const handler = NextAuth(authOptions); export { handler as GET, handler as POST };`. No business logic in this file (architecture: Route Handlers are HTTP boundary only).
  - [x] Add `app/api/auth/register/route.ts`: thin Route Handler — parse/validate the request body (non-empty email matching a basic shape, password length ≥ 8), call a small registration function (co-locate in `lib/services/auth.ts` or a new `lib/services/registerUser.ts` — the service layer, never the route itself) that hashes via `bcryptjs` and calls `lib/data/users.ts#createUser`. On duplicate email, respond with the AC3 error condition (do not sign in). On success, respond so the client can immediately call `signIn('credentials', …)` — this route creates the account; it does not itself establish the session. *(Validation moved into `registerUser()` in the service layer rather than the route, so the route stays a true passthrough per the testing task's exclusion.)*
- [x] Build the Registration/Login screen (AC: 1, 3, 4, 6, 7)
  - [x] Add `app/register/page.tsx` — a minimal Server Component page shell rendering the client form below. (No spec names an exact URL for this screen; `/register` is this story's naming choice — flag it in the PR/story notes rather than treating it as spec fact.)
  - [x] Add `app/components/AuthForm.tsx` (`'use client'`, named export): local toggle state between Sign Up / Sign In (one component, two modes — not two routes). Controlled `email`/`password` inputs. On submit: **Sign Up** → `fetch('/api/auth/register', …)`, then on success call `signIn('credentials', { redirect: false, email, password })` and route to `/` on success; **Sign In** → call `signIn('credentials', { redirect: false, email, password })` directly. Disable the submit control and swap its label to the in-progress copy (AC6) for the duration of the pending call. Render `{components.inline-error}` with the exact locked copy (AC3/AC4) on failure — never a field-by-field red-underline treatment beyond the one summary message (EXPERIENCE.md).
  - [x] `next-auth/react`'s `signIn()`/`useSession()` require a `SessionProvider` ancestor. Scope it narrowly: wrap only the `app/register` subtree (e.g. a small `Providers.tsx` client wrapper used in `app/register/layout.tsx`) rather than the root layout — no other route needs client-side session awareness yet. Note for future stories: Stories 2.2+ (Selfie Upload, Profile, AI Stylist gating) will need session awareness elsewhere and should promote this to the root layout then, not duplicate it.
- [x] Apply the approved visual system to the form (AC: 1, 3, 4, 6, 7)
  - [x] Extend `app/globals.css`'s existing `@theme inline` block with the color tokens this story needs. *(Note: `AppNavigation.tsx`/`TrendCard.tsx` were already fixed by the time this story ran — they now use `border-ink`, `bg-lime`, etc. via the theme block, not inline hex. Matched that exact established convention (native Tailwind utility classes generated from `@theme`, e.g. `border-ink`, `bg-surface-muted`) rather than inventing a separate `--color-border-ink`/`--color-ink-raised` naming scheme — only `--color-error` was actually missing and got added.)*
  - [x] Style per DESIGN.md tokens: ink-raised panel (`bg-surface-muted`), 3px `border-ink` border, `4px 4px 0` ink shadow on the form; inputs match the same fill/border, swapping to solid lime border + lime outline on focus; the error banner uses `border-error` with no tilt/shadow (deliberately calmer than the rest of the system); focus ring is 3px lime, 2px offset via `outline-lime`. Submit button is the screen's one lime "go" action; the Sign Up/Sign In toggle is an underlined text link (a real `<button type="button">` for accessibility, styled as a link — never a second prominent CTA).
- [x] Add and run verification (AC: 1-8)
  - [x] Unit test `lib/data/users.ts` with a mocked Mongo client/collection: create, find, duplicate-email rejection (both the pre-check and the `E11000` path).
  - [x] Unit test `authOptions.providers[0].authorize()` in isolation (mock `users.ts` + `bcrypt.compare`) for: correct credentials, wrong password, unknown email — assert all failure paths return `null` uniformly.
  - [x] Component-test `AuthForm.tsx`: toggle switches the visible form, submit disables + shows in-progress copy, error renders the exact locked strings, labels/inputs are correctly associated, focus ring is visible on keyboard focus.
  - [x] Do not unit-test the NextAuth route handler itself or `app/register/page.tsx`'s server rendering directly — both are thin/async boundaries; cover them with the live `npm run dev` smoke check instead, per the project's async-Server-Component testing policy.
  - [x] Run `npm test`, `npm run lint`, `npm run build`, and a live `npm run dev` smoke check: register a new account (verify redirect + a working session), attempt the same email again (verify AC3 copy, no duplicate document), sign in with the wrong password (verify AC4's generic copy), sign in correctly (verify session). *(Full live HTTP round-trip completed against the real MongoDB Atlas cluster — see Debug Log for the exact results and the one infra issue hit along the way.)*

## Dev Notes

### Developer context and scope

- This is the first story to touch MongoDB and to introduce a Client Component with real interaction. It stands up the shared Mongo connection (`lib/data/mongodb.ts`) that Stories 2.2–2.4 (`user_profiles`, `vto_tasks`) will reuse — build it generically (a `getDb()` accessor), not narrowly coupled to `users`.
- Scope is registration/login mechanics only: the `users` collection, the auth service, the NextAuth route, and the `/register` screen. Excluded: selfie capture/`user_profiles` (Story 2.2), any AI Stylist gating logic, Profile page, and wiring `AppNavigation.tsx`'s "AI Stylist"/"Profile" tabs to real destinations — those stay inert placeholders until the stories that own them.
- **Story 1.3 dependency note:** Story 1.3 (Anonymous Manual Overlay Preview) is drafted but **not yet implemented** (`ready-for-dev`, no code exists). Its spec states it renders a post-interaction CTA "as a clearly unavailable action/callout that Story 2.1 can activate." Since that CTA component doesn't exist in the codebase yet, this story cannot wire it — build `/register` as a standalone, reachable screen (e.g. linked from wherever makes sense today) and leave a short note in Completion Notes for whoever implements 1.3 (or a follow-up patch) to point that CTA at `/register`.

### Architecture compliance

- Layered paradigm, unchanged: `app/api/auth/*` (HTTP boundary only) → `lib/services/auth.ts` (business logic, no Next.js request/response types) → `lib/data/users.ts` + `lib/data/mongodb.ts` (the only files touching the Mongo driver). `AuthForm.tsx` is the one exception that talks to a Route Handler and to NextAuth's client SDK directly — it's UI, not a service.
- AD-7 governs this entire story: `CredentialsProvider` only, `session: { strategy: 'jwt' }` (NextAuth v4 forces this — Credentials + database sessions are incompatible, already verified against NextAuth's own docs when this AD was written), no adapter, `bcryptjs` hashing, `users` collection app-owned via `lib/data/users.ts`.
- AD-1 applies to every new server file: no `NEXT_PUBLIC_` prefix on `MONGODB_URI`/`NEXTAUTH_SECRET`, Node.js runtime (the default — do not add an `edge` runtime export to the auth routes; the `mongodb` driver and `bcryptjs` need full Node APIs).
- The `mongodb` driver's ESM/`bson` patterns commonly need `serverExternalPackages: ['mongodb']` in `next.config.ts` to avoid Server Component bundling errors (architecture Deferred note, now actionable since this is the first story that needs the driver) — add it if the build surfaces a bundling error; don't add speculatively if it builds clean.

### Existing files to preserve

- `app/globals.css` already has dark color-scheme, base font variables, and an `@theme inline` block (added in Story 1.1, left un-extended in Story 1.2 — that gap is exactly what this story's CSS task closes for the tokens it needs). Extend it; do not replace it.
- `app/layout.tsx` is a minimal root layout (metadata + dark body shell, Server Component). Do not add `SessionProvider` here — scope it to `app/register` only, per the Client Component task above. Do not regress its existing test.
- `app/components/AppNavigation.tsx` currently renders "AI Stylist" and "Profile" as inert `aria-disabled` spans (a known, already-logged defect from Story 1.2's code review — see that story's Review Findings). Do not fix or touch that component in this story; it's out of scope and already tracked.
- No `.env.local` or any env file exists yet in this repo — this story creates the first one (`.env.example` only; the real `.env.local` is a local/deploy-time artifact, never committed).

### UX implementation guardrails

- One screen, one component, two modes (toggle) — not two routes. Locked copy, verbatim, no paraphrasing:
  - Sign Up duplicate-email: `That email's already registered — sign in instead?`
  - Sign In mismatch (any cause): `Email or password didn't match — try again.`
  - In-progress: `Creating your account…` (Sign Up) / `Signing you in…` (Sign In)
- Plain register throughout (EXPERIENCE.md): sentence case, no hype typography, no all-caps, no tilt/sticker treatment on the form or its errors — this screen is transactional, not a celebration surface.
- Password field: `type="password"`, no strength meter (explicit hackathon-scope exclusion in the UX spec).
- Never a field-by-field red-underline treatment — one summary error message below the form, per DESIGN.md's `inline-error` token (calmer than every other component in the system: no dashed border, no shadow, no tilt).

### Testing requirements

- Jest + React Testing Library, co-located `__tests__/`, `.test.tsx` naming, per project-context.md.
- Data-layer and service-layer tests must isolate the database (mock the Mongo client/collection and `bcrypt`) — no test may require a live MongoDB connection to pass.
- `AuthForm.tsx` tests need meaningful role/name assertions (Story 1.2's review flagged two components for weak `getByText`-only assertions — do not repeat that here): assert on form roles, label associations, and the exact error/in-progress copy strings.
- Visual (focus-ring rendering, token colors) needs a browser/manual check — jsdom doesn't apply real focus-visible/contrast rendering.

### Previous story intelligence

- Story 1.2 (only story implemented so far) established: co-located `__tests__/` per component, `next/image`/Tailwind v4 utility patterns, and — critically — a code-review-caught anti-pattern of inlining hex colors instead of extending `@theme inline`. This story's CSS task exists specifically to not repeat that.
- Story 1.2's review also flagged testing gaps (mocking away the real data path entirely, so a real defect shipped green) and weak component assertions. Mirror the stronger pattern here: the data/service unit tests use realistic mocked inputs across success/failure branches, and `AuthForm` tests assert roles/names, not just visible text.
- Story 1.2's code review findings are unresolved action items on that story (status `in-progress`, not `done`) — none of them touch files this story creates, so there's no merge/preserve conflict, only a reminder that "12 patch items on 1.2" are still open and unrelated to this work.

### Latest technical information

- NextAuth v4 App Router setup: `app/api/auth/[...nextauth]/route.ts` exports `GET`/`POST` from a single `NextAuth(authOptions)` call; `authOptions` lives in its own module (here, `lib/services/auth.ts`) so both the route handler and any server-side `getServerSession(authOptions)` callers can import it. [Source: https://next-auth.js.org/configuration/initialization, https://next-auth.js.org/getting-started/example]
- NextAuth v4 `CredentialsProvider` requires `session: { strategy: 'jwt' }` — it cannot use database-persisted sessions. This was verified against NextAuth's own docs/FAQ when architecture AD-7 was written; still current. [Source: https://next-auth.js.org/faq]
- MongoDB Node.js driver connection pooling: never create a new `MongoClient` per request. In Next.js dev, module reloads on every file change will spawn a new client (and exhaust Atlas M0's connection cap) unless the client is cached on `globalThis`; production can use a plain module-level singleton since there's no dev-mode hot-reload. [Source: MongoDB driver docs; community-verified globalThis pattern for Next.js + long-lived DB clients]
- `bcryptjs` (pure JS) was chosen over native `bcrypt` in the architecture specifically because it has no `node-gyp` build step and is reliable on Vercel serverless Functions — do not substitute native `bcrypt`.

### Project Structure Notes

Expected story footprint (adjust component factoring only when it improves clarity and tests):

```text
app/
  api/
    auth/
      [...nextauth]/route.ts     # NEW: NextAuth handler
      register/route.ts          # NEW: registration endpoint
  register/
    page.tsx                     # NEW: screen shell
    layout.tsx                   # NEW: scopes SessionProvider to this subtree
  components/
    AuthForm.tsx                 # NEW: Sign Up / Sign In toggle form
    __tests__/
      AuthForm.test.tsx          # NEW
  globals.css                    # UPDATE: extend @theme inline with this story's tokens
lib/
  data/
    mongodb.ts                   # NEW: shared MongoClient singleton + getDb()
    users.ts                     # NEW: users collection repository
    __tests__/
      users.test.tsx             # NEW
  services/
    auth.ts                      # NEW: NextAuth authOptions + authorize()
    __tests__/
      auth.test.tsx               # NEW
.env.example                     # NEW
next.config.ts                   # UPDATE (conditionally): serverExternalPackages if bundling errors surface
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: User Registration & Login]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#AD-7 — Credentials-based auth ownership and session strategy]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Stack]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Information Architecture]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/EXPERIENCE.md#State Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-whattheheel-2026-08-17/DESIGN.md#Components]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/1-2-curated-trendsetter-feed-display.md#Review Findings]
- [Source: _bmad-output/implementation-artifacts/1-3-anonymous-manual-overlay-preview.md#Tasks / Subtasks]

## Dev Agent Record

### Agent Model Used

Claude (Sonnet 5)

### Debug Log References

- 2026-08-17: Discovered pre-existing, uncommitted, unrelated breakage in the working tree: `app/components/OverlayCanvas.tsx` and `app/preview/` (untracked, likely an interrupted Story 1.3 attempt — Story 1.3 itself was still `ready-for-dev` at the time). 5 `tsc` errors + 1 failing test in `OverlayCanvas.test.tsx`. Confirmed with the user this is out of scope for Story 2.1; left untouched. Verification gates were scoped to this story's own files rather than a whole-repo `npm run build`/`tsc`, per user direction.
- 2026-08-17 (later): Story 1.3 moved to `review` in sprint-status.yaml — a concurrent session evidently completed it while this story was in progress. Re-ran a whole-project `tsc --noEmit` and `npm test`: both fully clean (0 errors, 55/55 tests passing across 14 suites), confirming the earlier breakage was transient WIP, not a real regression. No conflict with this story's files.
- 2026-08-17 (live verification): User supplied a real MongoDB Atlas connection string in `.env.local` (gitignored, never committed — confirmed via `git check-ignore`). Verified raw driver connectivity/operations (connect, unique index creation, insert, find, `E11000` duplicate rejection, cleanup) via a throwaway script, all passing — then deleted the script. Hit one real infra issue: the pre-existing dev server (PID 12220, port 3100, running since before `.env.local` existed) had a stuck DNS resolver — `querySrv ETIMEOUT` on the Atlas SRV record — even though a fresh process resolved the identical hostname fine. Confirmed with the user before killing it; restarted `npm run dev` cleanly on port 3000. Full live HTTP smoke test then passed end-to-end: `POST /api/auth/register` → 201 with `{data:{id,email}}`; duplicate registration → 409 with the exact locked copy `That email's already registered — sign in instead?`; NextAuth sign-in with wrong password → 401 generic `CredentialsSignin` (no enumeration); correct sign-in → 200, redirects to `/`; `GET /api/auth/session` confirmed a real JWT session with the correct user email. Test account (`jordan.smoke@example.com`) deleted from Atlas afterward.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `.env.example` (new)
- `app/api/auth/[...nextauth]/route.ts` (new)
- `app/api/auth/register/route.ts` (new)
- `app/components/AuthForm.tsx` (new)
- `app/components/__tests__/AuthForm.test.tsx` (new)
- `app/register/page.tsx` (new)
- `app/register/layout.tsx` (new)
- `app/register/Providers.tsx` (new)
- `app/globals.css` (updated — added `--color-error` to the existing `@theme inline` block)
- `lib/data/mongodb.ts` (new)
- `lib/data/__tests__/mongodb.test.tsx` (new)
- `lib/data/users.ts` (new)
- `lib/data/__tests__/users.test.tsx` (new)
- `lib/services/auth.ts` (new)
- `lib/services/__tests__/auth.test.tsx` (new)
- `package.json` / `package-lock.json` (updated — added `mongodb`, `bcryptjs`, `next-auth`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — story/epic status transitions)

Not part of this story's changes (concurrent Story 1.3 work landed in the same working tree while this story was in progress): `app/components/OverlayCanvas.tsx`, `app/components/__tests__/OverlayCanvas.test.tsx`, `app/preview/`, `app/components/AppNavigation.tsx`, `app/components/TrendCard.tsx`, `app/components/__tests__/TrendCard.test.tsx`, `lib/data/trends.ts`, `lib/data/__tests__/trends.test.tsx`, `.gitignore`, `_bmad-output/implementation-artifacts/1-3-anonymous-manual-overlay-preview.md`.

## Change Log

- 2026-08-17: Implemented registration/login end-to-end (MongoDB connection, `users` data boundary, NextAuth Credentials auth, `/register` screen, visual tokens) and verified live against a real MongoDB Atlas cluster; advanced the story to review.
