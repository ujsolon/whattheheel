# Production Readiness — What the Heel

**Status of the build:** the hackathon MVP is feature-complete. Epic 1 and Epic 2 are done (stories 1.1–1.3, 2.1–2.8), 320 tests pass, lint and production build are clean, and the app is deployed and working against the real YouCam API.

**Status for a real release:** not ready. This document enumerates what stands between the current build and a product that can be put in front of the public.

Nothing here is a criticism of the MVP. Every item below was either a deliberate, documented hackathon-scope decision or a gap that only matters once real users and real money are involved. The point of this list is that those decisions were *deliberate* and are therefore recoverable — but they have to be paid back before launch, not after.

Sources: `_bmad-output/implementation-artifacts/deferred-work.md` (accumulated review deferrals), `ARCHITECTURE-SPINE.md`'s own Deferred section, and gaps identified while closing the MVP.

---

## Tier 0 — Cannot launch publicly without these

These are legal, financial, or safety blockers. Each one is a reason not to put a public link in front of strangers.

### 0.1 Personal data is stored with no privacy policy, consent, or deletion path

The product stores **user selfies** — face images — in Cloudinary, indefinitely, plus AI-generated images derived from them. There is currently:

- no privacy policy or terms of service anywhere in the app,
- no consent step before a face image is uploaded and sent to a third-party processor (Perfect Corp),
- no account deletion, and no way for a user to delete their selfie or their generated results,
- no data export.

Face images are personal data under GDPR and may be **biometric** data under stricter regimes (Illinois BIPA in particular treats face geometry as biometric identifiers with statutory damages per violation). Sending them to a third-party API without disclosed consent is the single largest exposure in this build.

**Work:** privacy policy + ToS; explicit consent at the selfie-upload boundary naming Perfect Corp as a processor; account deletion that purges Mongo documents *and* Cloudinary assets; data export. Legal review before launch, not after.

### 0.2 No rate limiting on the billable endpoint

`POST /api/vto-tasks` has an auth gate and nothing else. Every call spends **2 YouCam units**. A single authenticated account can drain the entire allotment in a loop, and there is no per-user quota, no global ceiling, and no circuit breaker.

`lib/data/registrationThrottle.ts` exists for registration only. The architecture's Deferred section explicitly scoped VTO rate limiting out for the hackathon timeline.

**Work:** per-user daily quota, a global spend ceiling that fails closed, and alerting well before the ceiling. This is cheap to build and expensive to omit.

### 0.3 Cloudinary assets are never deleted

`lib/external/cloudinary.ts` exports `deleteSelfie` but has no `deleteVtoResult`. VTO result images are never removed under any circumstance — not on selfie replacement, not on a lost upload race, not on account deletion (which does not exist). Storage grows monotonically, and so does the volume of retained personal data.

Compounds 0.1: you cannot honour a deletion request against assets you have no code path to delete.

### 0.4 No security headers

`next.config.ts` carries no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, or `Referrer-Policy`. The app is clickjackable and has no defence-in-depth against injected content. (`referrerPolicy` is set per-link on the Buy Now CTA only — that was a deliberate Story 2.5 decision, but it is not a substitute for a site-wide policy.)

### 0.5 Registration accepts any email, unverified

No email verification, no password strength requirement (Story 2.1 documented "no strength meter (hackathon scope)"). Accounts are free, unverified, and immediately able to spend YouCam units — which makes 0.2 materially worse.

---

## Tier 1 — Needed for sustained operation

The app will run without these. It will not run *reliably*, and you will not know when it stops.

### 1.1 No observability

Errors go to `console.error` and nowhere else. There is no error tracking, no APM, no uptime monitoring, no alerting. `correlationId`s are generated but never correlated — the Story 2.4 review found the route handler and the service each mint their own independent UUID for the same request, so the two log lines cannot be joined.

**Work:** error tracking (Sentry or equivalent), structured logging with a request-scoped correlation id threaded through all layers, uptime checks, and alerts on YouCam spend and error rate.

### 1.2 No CI pipeline

Tests, lint, and build run only when someone remembers to run them locally. Nothing gates a push. Deploys are manual `vercel --prod` invocations from a developer machine — GitHub→Vercel automatic deployment was never connected (`deferred-work.md`, 2026-08-17).

**Work:** CI on every PR running the existing suite; branch protection; connect automatic deploys; document a rollback procedure.

### 1.3 No end-to-end test of the actual funnel

All 320 tests are unit or component level with mocked boundaries. The complete path — register → upload selfie → generate → view result → buy → revisit in history — has never been exercised automatically. Every regression in the seams between stories has been caught by human review or live smoke-testing, which does not scale.

**Work:** Playwright covering the funnel against a seeded test account, with YouCam stubbed (see 1.4).

### 1.4 No mock mode for YouCam

There is no stub, so local development and any automated E2E run consume real, metered units against a finite allotment. The architecture flagged this as a known gap at the outset.

**Work:** a fixture-backed mock behind an env flag, using the response shapes already confirmed live and documented in Story 2.3's Debug Log.

### 1.5 Database is a single free-tier M0 cluster

512MB, no automated backups, shared infrastructure, no read replica. Acceptable for a demo; not for data you cannot lose. There is also **no migration tooling** — schema evolution so far has worked by adding optional fields and tolerating their absence, which is a sound pattern but is not a substitute for versioned migrations.

Known data debt: pre-2.6 tasks still carry a dead `resultUrl` field read by no code path.

### 1.6 Orphaned and stuck VTO tasks

Two known paths, both deferred with reasoning:

- YouCam accepts and bills a task, then the Mongo write fails → the task is billed and invisible (deferred from Story 2.3).
- `updateTaskStatus` returns `false` for a reason other than a lost race → `reconcileAfterLostRace` re-reads a still-`pending` document, the client keeps polling, and each tick re-hits the YouCam API. Bounded by the 90-second client ceiling, but wasteful and noisy. Fixing properly needs `updateTaskStatus` to return a tri-state rather than a boolean (deferred from Story 2.4).

### 1.7 Unbounded history query

`findSuccessfulTasksByUser` has no `.limit()`, no `{ userId, status }` compound index, and sorts on an unindexed field. Every Profile render pulls every successful task, signs a Cloudinary URL for each, and emits a full-size `<img>` per row on a mobile-first page. Fine at demo volume; degrades badly with use.

---

## Tier 2 — Quality bar

Real gaps that shape whether people enjoy using it, but not blockers.

### 2.1 iPhone photos are rejected

Direct HEIC/HEIF upload is unsupported — the standard Sharp/Vercel runtime cannot decode HEVC-backed HEIC without a custom libvips build, and the viable JS decoder either requires browser Workers or carries a CVE. Users must convert before uploading. **This is the highest-friction item on the list for real-world use**, since HEIC is the iPhone camera default.

### 2.2 The trend seed is a build-time artifact with a latent failure mode

`lib/data/trends.ts` reads `public/trends.json` via `readFileSync(process.cwd()/…)`. The feed route is statically prerendered, so seed edits do not appear until a rebuild — while the publicly served `/trends.json` URL updates instantly, so the two disagree. More importantly, `public/` is CDN-served and not guaranteed present at `process.cwd()` inside a serverless function; the dynamic routes that call `getTrends()` at request time are relying on behaviour that is not contractually guaranteed. Fix with a static `import` of the JSON or `outputFileTracingIncludes`.

Related: nothing validates that curated shoe images actually meet the YouCam product-image spec (≥512×512, shoe >25% of frame height). That is currently the curator's responsibility, unchecked by any code.

### 2.3 Retail links are unmanaged

Five hand-entered URLs with no affiliate program, no link-rot detection, no price or availability sync, and no attribution. A dead or redirected product link degrades silently. There is also no render-time validation of `buyUrl` at the anchor — it trusts the invariant that every `Trend` came from `getTrends()`, which holds today but is enforced nowhere in the type system.

### 2.4 Design-token drift

`DESIGN.md`'s typography scale was never implemented — shipped sizes differ from the spec's tokens across the h1, marquee, and card headings, and the `'Arial Black'` display stack was never added, so weight 900 is synthesized. Either conform the code or write the shipped values back into the spec; the failure mode to avoid is leaving them silently diverged.

`app/loading.tsx` remains unreachable dead code whose skeleton has drifted from the real card geometry.

### 2.5 Accessibility follow-ups

The overlay canvas exposes live labelled values for scale and rotation but not for X/Y position, which is adjustable by both drag and arrow keys — a parity gap. Reduced-motion is handled in the three places EXPERIENCE.md names, but has not been audited beyond them.

---

## Suggested sequence

1. **Legal and safety first** (0.1, 0.4, 0.5) — these gate any public link, and 0.1 has the longest lead time because it needs a human lawyer.
2. **Then cost control** (0.2, 0.3) — cheap to build, and until they exist every new user is an uncapped liability against a metered API.
3. **Then the ability to know things are broken** (1.1, 1.2) — everything after this is easier once failures are visible and regressions are gated.
4. **Then durability** (1.5, 1.6, 1.7) and the test/mock infrastructure (1.3, 1.4) that makes further change safe.
5. **Then the quality bar** — with 2.1 (HEIC) promoted if the real audience is iPhone-heavy, which it almost certainly is.

## What is genuinely solid

Worth stating, because it is what makes the above tractable:

- The layered architecture held. External calls are confined to `lib/external/*`, Mongo to `lib/data/*`, orchestration to `lib/services/*`, and no story leaked across those lines.
- Ownership and auth boundaries are correct and tested — the 404-not-403 rule for foreign task ids has explicit regression coverage.
- Secrets are server-only throughout; no key has ever been `NEXT_PUBLIC_`-prefixed.
- The locked error-copy contract (AD-6) is honoured character-for-character and verified by test.
- Every architectural decision that was deferred was *documented as deferred*, with reasoning, which is why this list could be assembled at all rather than discovered in production.
