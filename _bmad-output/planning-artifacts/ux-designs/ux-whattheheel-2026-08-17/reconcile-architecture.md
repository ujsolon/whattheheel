# Reconciliation: UX Spine Pair vs Architecture Spine

**Scope:** Architecture-vs-UX-spine consistency only (no PRD fidelity, no visual-design-quality checks — those are covered elsewhere).

**Inputs reviewed (full text):**
- `DESIGN.md` (ux-whattheheel-2026-08-17)
- `EXPERIENCE.md` (ux-whattheheel-2026-08-17)
- `ARCHITECTURE-SPINE.md` (architecture-whattheheel-2026-08-16), including the current AD-7 (Credentials-based auth / JWT / no adapter / bcryptjs)

## Verdict

**Consistent.** The UX spine pair is aligned with the current architecture spine, including the AD-7 update. No stale NextAuth-adapter or OAuth-flow references remain — every mention of "adapter"/"OAuth" in EXPERIENCE.md is a correct statement of their *absence* ("no adapter", "no OAuth button"), matching AD-7's Credentials-only, JWT-session, no-adapter rule.

## Checks performed and results

### 1. Named components / routes
- `OverlayCanvas.tsx` — named identically in architecture's Capability Map (FR-02 row) and EXPERIENCE.md's Component Patterns / Key Flow 1. No contradiction.
- "stylist result component" — architecture's Capability Map (FR-06 row) uses this exact generic phrase; EXPERIENCE.md's VTO result display row explicitly parenthesizes "(the architecture's 'stylist result component')" — a deliberate, correct cross-reference.
- Route names — `POST /api/auth/register`, `POST /api/vto-tasks`, `GET /api/vto-tasks/[id]` in EXPERIENCE.md match the architecture's Structural Seed file tree exactly (segment names, HTTP verbs).
- Page-route surfaces (Feed / AI Stylist / Profile) match architecture's `(page routes)/ # Trendsetter feed, stylist, profile` comment; EXPERIENCE.md's IA section explicitly cites this match.

### 2. AD behavioral consequences reflected in EXPERIENCE.md
- **AD-1 (server-only calls):** Upload control row states validation happens server-side before Cloudinary upload; no client-side Cloudinary/YouCam call is ever implied anywhere in Component/State Patterns or the two Key Flows. Consistent.
- **AD-2 (single VTO task owner / one polling endpoint):** VTO polling row specifies a single `GET /api/vto-tasks/[id]` poll every 2s; no alternate/duplicate polling path described. Consistent.
- **AD-3 (registered-only, ownership-scoped):** IA gating table + Foundation section both gate AI Stylist behind login + saved selfie; `OverlayCanvas.tsx` row explicitly notes "Client-only, no network call (AD-3)" for the anonymous path. Consistent. (Ownership-scoping's 404-not-403 mismatch behavior is a pure backend/security concern with no distinct UX surface — reasonably omitted from a UX spine.)
- **AD-4 (image bytes vs. metadata):** Flow 2 step 2 describes selfie "uploads to Cloudinary, and `user_profiles.selfieUrl` is saved" — correctly reflects that only the URL, not bytes, persists to Mongo-backed state. Consistent.
- **AD-5 (single validation point, server-side):** Stated repeatedly and consistently — Component Patterns "Upload control" row, State Patterns "Error (upload validation)" row, and Flow 2 step 2 all describe server-side validation with client-side checks as "a UX hint only." Consistent.
- **AD-6 (VTO failure handling contract):** Voice and Tone's locked-copy table reproduces all six YouCam error codes verbatim, including `invalid_parameter` mapping to the `error_inference` user-facing copy exactly as AD-6 specifies. Inline-only (never modal) rendering is stated in Component Patterns, State Patterns, and the Interaction Primitives "Banned" list. Consistent.
- **AD-7 (Credentials/JWT/no adapter/bcryptjs):** IA table ("no OAuth button, no adapter"), Component Patterns Registration/Login row ("no OAuth button anywhere — architecture AD-7"), and Flow 2 step 1 ("hashes his password (bcryptjs) and creates the `users` document — no adapter, no OAuth (architecture AD-7) — then he's signed in immediately via a JWT session") all match the current AD-7 rule precisely. Consistent.

### 3. Data model fields
- `TREND.buyUrl` — Buy Now Link component row: "Renders only when the trend's `buyUrl` is present ... hidden entirely ... when absent." Field name and hide-not-disable behavior both match architecture (Capability Map FR-05 row + ER diagram).
- `VTO_TASK.status` / error codes — used correctly throughout (Polling/Result/Failure surfaces keyed off `status: success` / `error` + error code).
- `VTO_TASK.style` — EXPERIENCE.md explicitly flags the epics.md AC drift (Story 2.3 mentions a style picker; memlog/architecture imply a single fixed style, no picker UI) and designs accordingly, banning a style picker in Interaction Primitives. This is a correct, self-aware handling of a fixed-value field, not a contradiction.
- `USER_PROFILE.selfieUrl` — named exactly in Flow 2 ("`user_profiles.selfieUrl` is saved").
- `USER.id/email/passwordHash` — not surfaced in UX spine, which is expected/appropriate (backend-only fields).

### 4. Foundation section vs. deployment/stack reality
- Tailwind CSS v4, no other UI system (no shadcn/MUI/internal library) — stated explicitly and correctly.
- Single Next.js app, no native shell — correct.
- Minor observation (not a contradiction): Foundation doesn't use the literal phrase "App Router" — it's only implied via the IA section's cross-reference to the architecture's `(page routes)/` comment. Architecture's own paradigm line names "Next.js App Router" explicitly. This is a nit, not an inconsistency — no Pages-Router-shaped assumption appears anywhere in EXPERIENCE.md.

### 5. Stale NextAuth-adapter / OAuth trace check (explicit ask)
Searched all "adapter" and "OAuth" occurrences in EXPERIENCE.md:
- "no OAuth button, no adapter" (Information Architecture, Registration/Login row)
- "no OAuth button anywhere — architecture AD-7" (Component Patterns, Registration/Login form row)
- "no adapter, no OAuth (architecture AD-7)" (Key Flow 2, step 1)

All three are correct statements that these do **not** exist — none imply an adapter creates users or that an OAuth flow exists. **No stale trace found; the earlier fix held.**

## Minor items (informational only, not blocking)

- Foundation section could explicitly say "Next.js App Router" for completeness/searchability, though it's unambiguous from context. Optional polish, not a defect.
