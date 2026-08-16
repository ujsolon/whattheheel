# Reviewer Gate — Version/Reality-Check Review

**Reviewer lens:** every pinned version and combination in the Stack table must be reality-checked against current npm registry / vendor data, not asserted from training data.

**Method:** WebSearch spot-checks plus direct `registry.npmjs.org` fetches (via `curl`) for the packages where an exact patch pin matters (`next`, `react`, `mongodb`, `cloudinary`, `next-auth`, `@next-auth/mongodb-adapter`, `typescript`).

## Verdict

All nine pinned/named stack entries refer to real, currently-installable packages, and the two version pairings most likely to conflict (`next-auth@4.24.15` × `Next.js 16`, `Node.js 24` × `Next.js 16`) check out. Two non-blocking risks surfaced: the `next` and `react` pins are several releases behind the current tip (not wrong, just aging), and `@next-auth/mongodb-adapter` — needed to make the deliberate v4 choice work with MongoDB — is an abandoned package (last published April 2023, 3+ years stale). Neither invalidates the architecture, but both are worth a line in the doc.

## Findings by stack row

### Next.js 16.0.3 — REAL, but ~9 months / 3 minor versions stale
Confirmed via `registry.npmjs.org/next`: `16.0.3` was published 2025-11-13 (a real patch release, not fabricated). However, as of this review (2026-08-17) the registry's `latest` dist-tag is `16.3.1`, with `16.0.4`–`16.0.11` and the `16.1`/`16.2`/`16.3` minors released after it. This isn't an error — pinning an older stable patch for a hackathon is defensible — but it's not "the current version" either. Minor flag: consider noting in the doc that this is a deliberately-pinned patch, not the tip, so a future reader doesn't assume it was pulled fresh.

### Node.js 24 (Active LTS) — CONFIRMED correct
Node 24 is Active LTS through 2026, with support extending to April 2028 (nodesource.com, endoflife.date). Next.js 16's documented minimum is Node 20.9+, so Node 24 clears it with margin. No conflict found between Next.js 16 and Node 24.

### React 19.2.0 — REAL, minor patch drift
Confirmed on the registry: `19.2.0` exists (published 2025-10-01). Current latest is `19.2.8` — same minor line, just patch-level behind. Low risk, no action needed.

### TypeScript 5 — fine, but note TS 7 now exists
`typescript`'s npm `latest` dist-tag is now `7.0.2` (a native/Go-based compiler Vercel's own 16.3 blog post references as an opt-in faster type-checker for `next build`). Pinning "TypeScript 5" is still a safe, mainstream choice — TS7 is very new and not yet the ecosystem default — so this is not a defect, just worth knowing the ceiling moved.

### Tailwind CSS 4 — CONFIRMED current, correctly unpinned to a patch
Latest is `4.3.3` (2026-07-16). The Stack table's major-only "4" pin is reasonable since Tailwind doesn't break within v4 in ways that matter here.

### ESLint 9 (eslint-config-next) — CONFIRMED compatible with Next.js 16
`next lint` was removed in Next.js 16 in favor of using ESLint 9 flat config directly; `eslint-config-next` ships flat-config exports (`eslint-config-next/core-web-vitals`, `/typescript`) and its own latest release (`16.3.1`) explicitly targets ESLint 9 + Next.js 16. No conflict.

### mongodb (npm driver) 7.5.0 — CONFIRMED, is actually the current `latest`
Registry fetch confirms `7.5.0` is the `dist-tags.latest` for the `mongodb` package (July 2026 release, Queryable Encryption string-query GA). This is the freshest possible pin, not stale.

### cloudinary (npm SDK) 2.10.0 — CONFIRMED, is actually the current `latest`
Registry fetch confirms `2.10.0` is the `dist-tags.latest` for `cloudinary`. Also freshest possible pin.

### next-auth 4.24.15 — CONFIRMED, and the specific patch matters
`4.24.15` is genuinely the latest 4.x release (a July 2026 security patch fixing `getToken()` on malformed Bearer headers). More importantly for this review's purpose: a `registry.npmjs.org/next-auth/4.24.15` fetch shows its `peerDependencies.next` range is `"^12.2.5 || ^13 || ^14 || ^15 || ^16"` — it explicitly allows Next.js 16. This matters because earlier next-auth 4.x patches (e.g. 4.24.11, per GitHub issue nextauthjs/next-auth#13302, opened 2025-10-25) had a peer range capped at `^15`, which threw `npm install` peer-dependency errors against Next.js 16 without `--legacy-peer-deps`. So the *specific* pin of 4.24.15 (not just "next-auth v4") is load-bearing here — a careless "next-auth v4" pin without checking the exact patch could have reintroduced that install failure. As pinned, the doc's choice is correct and the v4 × Next.js 16 App Router pairing installs cleanly.

## Risks found beyond the literal Stack table

### @next-auth/mongodb-adapter — stale package (flag, not necessarily blocking)
The Stack table pins this as "latest v4-compatible release" rather than a version number. Registry fetch shows that resolves to `1.1.3`, published **2023-04-20** — no updates in over three years. The actively-maintained successor, `@auth/mongodb-adapter` (v3.11.1, updated ~5 months ago), only supports Auth.js v5, which the architecture deliberately rejected for being in beta. So the doc's choice isn't wrong, but it is pairing a modern Next.js 16 / next-auth 4.24.15 stack with an adapter package that has had zero maintenance since early 2023. Worth a one-line callout in the Stack table or Deferred section (e.g. "adapter unmaintained since 2023; if it breaks against a future MongoDB driver major, fall back to a custom `Adapter` implementation") so it isn't mistaken for an actively-supported dependency.

### mongodb driver + Next.js bundling — implementation gotcha, not an architecture defect
Community reports (Next.js docs' own `serverExternalPackages` guidance, Mongoose's Next.js integration doc) note that MongoDB's driver/`bson` uses ESM top-level-await/dynamic-import patterns that can trip Next.js's default Server Component bundling, and the standard fix is adding the driver to `serverExternalPackages` in `next.config`. This doesn't contradict any invariant in the spine (AD-1/AD-2's "Data/External layer only" rule is unaffected) — it's a build-config detail one layer below architecture — but since `lib/data/*` is specifically where this driver lives, it may be worth a one-line implementation note so a developer isn't surprised by a Turbopack/webpack error on first build.

## Non-findings (checked, no issue)
- No evidence any of the nine pinned package names/versions are fabricated — all exist on the npm registry as stated.
- No known hard incompatibility between Next.js 16 and Node.js 24.
- No known hard incompatibility between Tailwind CSS 4 and Next.js 16 / Turbopack.
- ESLint 9 + `eslint-config-next` is the documented, supported path post-`next lint` removal, matching the doc's framing.
