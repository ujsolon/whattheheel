# Story 2.1: User Registration & Login

Status: ready-for-dev

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

- [ ] Provision the shared MongoDB connection (AC: 2, 5, 8)
  - [ ] Add `mongodb` `^7.5.0` as a dependency.
  - [ ] Add `lib/data/mongodb.ts`: a singleton `MongoClient`, cached on `globalThis` in development to survive Next.js hot-reload (a fresh client per reload exhausts Atlas M0's connection limit), a plain module-level singleton in production. Read `MONGODB_URI` from `process.env`; throw a clear startup error if it is missing — do not silently no-op. Export a `getDb()` helper that reads the database name from `MONGODB_DB_NAME` (architecture: separate `whattheheel_dev`/`whattheheel_prod` names, never hardcoded).
  - [ ] Add `.env.example` documenting `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (`http://localhost:3000` for dev) with placeholder values only. Never commit `.env.local`; confirm `.gitignore` already excludes it (it does — verified `.env*` pattern present).
- [ ] Build the `users` data boundary (AC: 2, 3, 5, 8)
  - [ ] Add `bcryptjs` (`^3.0.3`) as a dependency. Check whether TypeScript reports missing types after install — recent `bcryptjs` ships its own `.d.ts`; add `@types/bcryptjs` only if the build actually complains.
  - [ ] Add `lib/data/users.ts`: typed `User` interface (`id: string`, `email: string`, `passwordHash: string`, `createdAt: Date`). Export `findUserByEmail(email)` and `createUser(email, passwordHash)`. Store email lowercased and trimmed for lookup consistency. Create a **unique index on `email`** (idempotent `createIndex` call, e.g. run once from `getDb()`/a users-collection accessor) so a duplicate Sign Up is rejected at the database layer even under a race — do not rely on check-then-insert alone.
  - [ ] `createUser` must surface a distinguishable "duplicate email" condition (either a pre-check via `findUserByEmail`, or catching the Mongo `E11000` duplicate-key error) so the caller can produce AC3's copy without leaking which check failed.
  - [ ] No other file touches the `users` collection or imports the `mongodb` driver directly — only `lib/data/*`.
- [ ] Implement the auth service and NextAuth wiring (AC: 1, 2, 4, 5, 7, 8)
  - [ ] Add `next-auth` `4.24.15`. Try a normal `npm install` first; the `--legacy-peer-deps` requirement noted in the architecture was specific to the now-dropped adapter package, so it may no longer be necessary for `next-auth` alone against Next.js 16 — only fall back to the flag if `npm` reports an actual peer conflict.
  - [ ] Add `lib/services/auth.ts` exporting NextAuth `authOptions`: one `CredentialsProvider` (`email`, `password` fields), `session: { strategy: 'jwt' }`, `secret: process.env.NEXTAUTH_SECRET`. Its `authorize()` calls `lib/data/users.ts` (`findUserByEmail` + `bcrypt.compare`) and **returns `null` on every failure path** (unknown email, wrong password) — never `throw` — so the client always receives the same generic outcome, satisfying AC4's no-enumeration requirement at the logic layer, not just in the UI copy.
  - [ ] Add `app/api/auth/[...nextauth]/route.ts`: thin handler — `const handler = NextAuth(authOptions); export { handler as GET, handler as POST };`. No business logic in this file (architecture: Route Handlers are HTTP boundary only).
  - [ ] Add `app/api/auth/register/route.ts`: thin Route Handler — parse/validate the request body (non-empty email matching a basic shape, password length ≥ 8), call a small registration function (co-locate in `lib/services/auth.ts` or a new `lib/services/registerUser.ts` — the service layer, never the route itself) that hashes via `bcryptjs` and calls `lib/data/users.ts#createUser`. On duplicate email, respond with the AC3 error condition (do not sign in). On success, respond so the client can immediately call `signIn('credentials', …)` — this route creates the account; it does not itself establish the session.
- [ ] Build the Registration/Login screen (AC: 1, 3, 4, 6, 7)
  - [ ] Add `app/register/page.tsx` — a minimal Server Component page shell rendering the client form below. (No spec names an exact URL for this screen; `/register` is this story's naming choice — flag it in the PR/story notes rather than treating it as spec fact.)
  - [ ] Add `app/components/AuthForm.tsx` (`'use client'`, named export): local toggle state between Sign Up / Sign In (one component, two modes — not two routes). Controlled `email`/`password` inputs. On submit: **Sign Up** → `fetch('/api/auth/register', …)`, then on success call `signIn('credentials', { redirect: false, email, password })` and route to `/` on success; **Sign In** → call `signIn('credentials', { redirect: false, email, password })` directly. Disable the submit control and swap its label to the in-progress copy (AC6) for the duration of the pending call. Render `{components.inline-error}` with the exact locked copy (AC3/AC4) on failure — never a field-by-field red-underline treatment beyond the one summary message (EXPERIENCE.md).
  - [ ] `next-auth/react`'s `signIn()`/`useSession()` require a `SessionProvider` ancestor. Scope it narrowly: wrap only the `app/register` subtree (e.g. a small `Providers.tsx` client wrapper used in `app/register/layout.tsx`) rather than the root layout — no other route needs client-side session awareness yet. Note for future stories: Stories 2.2+ (Selfie Upload, Profile, AI Stylist gating) will need session awareness elsewhere and should promote this to the root layout then, not duplicate it.
- [ ] Apply the approved visual system to the form (AC: 1, 3, 4, 6, 7)
  - [ ] Extend `app/globals.css`'s existing `@theme inline` block with the color tokens this story needs (`--color-lime`, `--color-ink-raised`, `--color-border-ink`, `--color-error`, `--color-on-ink`) instead of inlining hex literals in the component, the way `AppNavigation.tsx`/`TrendCard.tsx` currently do — Story 1.2's code review flagged that exact pattern as a defect; do not repeat it here.
  - [ ] Style per DESIGN.md tokens: `{components.auth-form}` (ink-raised panel, 3px border-ink border, `4px 4px 0 border-ink` shadow), `{components.input-field}` (ink-raised fill, border swaps to solid lime on focus), `{components.inline-error}` (ink-raised panel, solid error-red border, no tilt/shadow — deliberately calmer than the rest of the system), `{components.focus-ring}` (3px lime outline, 2px offset). Submit button is the screen's one lime "go" action; the Sign Up/Sign In toggle is an underlined text link, never a second button.
- [ ] Add and run verification (AC: 1-8)
  - [ ] Unit test `lib/data/users.ts` with a mocked Mongo client/collection: create, find, duplicate-email rejection (both the pre-check and the `E11000` path).
  - [ ] Unit test `authOptions.providers[0].authorize()` in isolation (mock `users.ts` + `bcrypt.compare`) for: correct credentials, wrong password, unknown email — assert all failure paths return `null` uniformly.
  - [ ] Component-test `AuthForm.tsx`: toggle switches the visible form, submit disables + shows in-progress copy, error renders the exact locked strings, labels/inputs are correctly associated, focus ring is visible on keyboard focus.
  - [ ] Do not unit-test the NextAuth route handler itself or `app/register/page.tsx`'s server rendering directly — both are thin/async boundaries; cover them with the live `npm run dev` smoke check instead, per the project's async-Server-Component testing policy.
  - [ ] Run `npm test`, `npm run lint`, `npm run build`, and a live `npm run dev` smoke check: register a new account (verify redirect + a working session), attempt the same email again (verify AC3 copy, no duplicate document), sign in with the wrong password (verify AC4's generic copy), sign in correctly (verify session).

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

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
