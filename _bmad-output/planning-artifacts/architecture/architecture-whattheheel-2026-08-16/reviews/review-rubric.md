# Rubric Walker Review — ARCHITECTURE-SPINE.md (What the Heel)

Reviewed against: sources/prd.md, project-context.md, docs/perfectcorp-api-reference.md, docs/pricing-and-consumption.md.

Scale/altitude acknowledged: hackathon, feature altitude, build-substrate. Findings are calibrated accordingly — no platform-scale concerns invented.

## Overall Verdict

Solid, terse spine. Six ADs are all enforceable and each maps to a real divergence risk (client-side secret leakage, duplicate VTO orchestration, anonymous cost exposure, BSON bloat, drifting validation, inconsistent error UI). Deferred items are genuinely low-risk to defer at this altitude. Three concrete gaps keep it from being clean: one vague/unpinned dependency version, one un-named data field that two FRs both touch, and a real conflict between AD-1's core guarantee and the literal example pattern in the cited project-context.md source.

## Findings (ranked by severity)

### 1. `@next-auth/mongodb-adapter` version is the exact anti-pattern the checklist flags (Medium)
Stack table (line 100): `@next-auth/mongodb-adapter | latest v4-compatible release`. Every other dependency in the table is pinned to a specific version (Next.js 16.0.3, mongodb 7.5.0, cloudinary 2.10.0, next-auth 4.24.15, etc.) — this one line reverts to exactly the vague "latest" pattern the good-spine bar warns against. It's a one-line fix (pin an actual version), but as written it's inconsistent with the rest of the table and not verified-current.

### 2. AD-1's guarantee conflicts with the literal example in a cited source doc (Medium)
AD-1 exists specifically to prevent "API keys (YouCam, Cloudinary) reaching the client bundle." The Consistency Conventions table only says "All secrets via environment variables only, never hardcoded" — it never states env-var naming or forbids the `NEXT_PUBLIC_` prefix. But `project-context.md` (line 65), which is listed in this spine's own `sources:`, gives this as its literal example: *"Always use environment variables (e.g., `process.env.NEXT_PUBLIC_...`) configured via `.env.local`."* In Next.js, any `NEXT_PUBLIC_`-prefixed var is inlined into the client bundle. A builder following the cited convention doc's example verbatim for a YouCam/Cloudinary key would violate AD-1 outright and ship a secret to the browser. This is exactly the kind of divergence point the spine is supposed to close off, and it sits at the intersection of two documents this spine explicitly binds to — worth one explicit line (e.g., "secret env vars must never use the `NEXT_PUBLIC_` prefix").

### 3. Retail/"buy-now" field has no canonical name (Medium)
The Capability → Architecture Map assigns FR-05 to `lib/data/trends.ts (buy-now URL field)`, but the `erDiagram`'s `TREND` entity only lists `id`, `shoeImageUrl`, `label` — no buy-now/retail-link field at all, and no name is pinned anywhere else in the doc (Consistency Conventions covers ids/dates/error envelopes but not this). FR-01 (feed) and FR-05 (retail links) are both explicitly in scope for this spine, and a feed builder and a retail-link builder working independently have no single source of truth for what to call this field (`buyNowUrl` vs `retailUrl` vs `buyUrl`) or whether it's required vs optional per trend. Cheap fix: add the field to the `TREND` entity block.

### 4. Deployment/operational envelope is implicit rather than decided (Low)
Vercel appears only as a label inside the Structural Seed diagram ("Next.js app (Vercel)") — it's never a decided line item (e.g., in Stack, or its own short subsection), and there's no stated environment strategy (single shared prod vs. dev/preview separation) or note on whether local development exercises real, billed YouCam calls or a stubbed path. Given the Cost Management NFR is otherwise handled carefully (AD-3, PRD unit-cost table), the absence of any statement about dev-time YouCam usage is a small but real gap — not enough to block build start at this scale, but the kind of thing that's cheap to make explicit in one line.

### 5. Success-response envelope left unspecified (Low / nit)
Consistency Conventions pins the error envelope (`{ error: { code, message } }`) but not a success envelope for `POST /api/vto-tasks`, `GET /api/vto-tasks/[id]`, or `POST /api/upload`. Likely fine to leave to story/implementation level for a small hackathon team building both ends together, but flagging since the doc otherwise treats "data & formats" as in-scope.

## Checks that passed cleanly

- **Mermaid validity**: all three diagrams (layered `graph LR`, structural-seed `graph TB`, `erDiagram`) are syntactically valid and non-placeholder — real node/entity content, not stub graphs.
- **AD enforceability**: all six ADs name a specific file/layer and a checkable rule (e.g., AD-3's server-side session check, AD-6's single error-copy map) — none are vague aspirational statements.
- **Deferred section**: none of the five deferred items risk a feature-altitude divergence — each is either genuinely orthogonal to build start (retail link source, CI/CD specifics) or invariant under either resolution (NextAuth session strategy doesn't change how routes read sessions).
- **Terseness**: the doc stays table/rule-driven throughout; "Prevents" bullets under each AD justify enforcement scope rather than reading as rationale essays; Deferred entries carry one clause of justification each, appropriately brief.
- **FR coverage**: all six PRD FRs (FR-01…FR-06) and all five NFR categories (Performance, Security, UX, Image Constraints, Cost Management) have a home in the Capability → Architecture Map or an AD, except for the two gaps noted above (env var naming, retail field naming).
