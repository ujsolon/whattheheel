# Adversarial Review — ARCHITECTURE-SPINE (What the Heel)

**Reviewer stance:** attack the spine as an adversary. For each finding below I construct two units (stories/epics/developers) that each follow every applicable AD and Consistency Convention to the letter, yet end up incompatible when integrated. Findings that are already closed by an existing AD/convention are omitted.

**Verdict:** The spine is directionally sound but has several genuine gaps — most concentrated around (a) what happens *outside* the Route Handler → Service → Data chain, (b) who "owns" a Mongo document when a third-party library (NextAuth's adapter) also writes to it, and (c) the `vto_tasks` lifecycle's concurrency/idempotency/ownership rules. None of these are nitpicks; each is constructed to show two spec-compliant builds producing different runtime behavior or a live security gap.

---

## Finding 1 — Service-layer bypass silently defeats AD-3's cost gate (High)

**AD text relied on:**
- Design Paradigm: "A module in `lib/data/*` or `lib/external/*` must never import from `lib/services/*` or `app/*`." — this constrains only the *data/external* layer's imports upward. Nothing constrains `app/**` from importing `lib/services/*` directly.
- AD-3: "`POST /api/vto-tasks` requires an authenticated session, checked server-side **inside the route handler**."
- Design Paradigm on services: "Plain TypeScript; never imports `next/server` request/response types, so it stays portable" — this is presented as a *feature* (importable anywhere server-side), not fenced off.

**Scenario:**
- **Unit A** builds `app/api/vto-tasks/route.ts` exactly as specified: parses the request, checks the session, calls `vtoTask.ts`.
- **Unit B**, building a "resume last VTO result on page load" story, writes a Server Component (`app/stylist/page.tsx`) that imports `lib/services/vtoTask.ts` directly and calls `createOrGetTask(...)` during SSR to avoid a client-side fetch waterfall. This is plain, portable TypeScript exactly as advertised, running server-side, on the Node runtime — nothing in AD-1 or the dependency diagram forbids it.

**Incompatibility:** AD-3's auth check is specified as living "inside the route handler," not inside the service. Unit B's SSR path never touches the route handler, so it never hits that check — unless the developer independently reasons "the service should also verify" and duplicates the check there (violating AD-2's "not reimplemented in more than one place" spirit) or omits it (creating an unauthenticated path to a billed YouCam call, exactly what AD-3 exists to prevent). Both outcomes are "compliant" with the literal spine text.

**Fix:** Tighten AD-3 (or add AD-7): the auth check must live in `lib/services/vtoTask.ts` itself (not only the route handler), and/or explicitly forbid `app/**` Server/Client Components from importing `lib/services/*` — only Route Handlers may call services. Pick one and state it; currently both readings are open.

---

## Finding 2 — TREND entity has two contradictory authoritative sources (High)

**AD text relied on:**
- Naming convention table: "MongoDB collections: lower_snake_case, plural (`users`, `vto_tasks`, `trends`)" — explicitly lists `trends` as a Mongo collection.
- Structural seed: `public/trends.json # curated trend dataset seed (FR-01)`.
- Structural seed: `lib/data/trends.ts # trends collection/JSON read` — the comment itself hedges between both.
- Deferred: "Curated JSON dataset sourcing/maintenance workflow ... not an architecture concern until FR-01's data pipeline is built" — defers the *sourcing* question but the spine has already committed to two different storage mechanisms in two other places.

**Scenario:**
- **Unit A** (FR-01 Trendsetter Feed) implements `lib/data/trends.ts` as a straight `import trends from 'public/trends.json'` reader — no Mongo involved, matching the structural-seed line item for `public/trends.json`.
- **Unit B** (FR-05 Retail Integration, "lives in `lib/data/trends.ts` (buy-now URL field)" per the Capability Map) seeds an actual `trends` Mongo collection — matching the naming-convention table that lists `trends` alongside `users`/`vto_tasks` as real collections — and points `lib/data/trends.ts` at Mongo instead.

**Incompatibility:** Both units can point to spine text that says "this is where trend data lives." Whichever lands second either silently reverts the other's edits (JSON build overwrites Mongo-seeded reads) or a demo edit to `public/trends.json` (e.g., fixing a buy-now URL at 11pm before judging) has no effect because the live path reads Mongo. This is a same-entity, two-source-of-truth bug that's invisible until integration.

**Fix:** Add an explicit AD (or resolve now, it's cheap): "Trend data is read directly from `public/trends.json` at request time; there is no `trends` Mongo collection for the hackathon scope." Then fix the naming-convention table (drop `trends` from the Mongo collection list, or add a footnote) so the two artifacts stop contradicting each other.

---

## Finding 3 — `users` collection has two writers: NextAuth's adapter and `lib/data/users.ts` (High)

**AD text relied on:**
- Consistency Convention (State & cross-cutting): "Mongo writes happen only inside `lib/data/*`, called only from `lib/services/*` — Route Handlers never call the driver directly."
- Stack: `@next-auth/mongodb-adapter` — this adapter, by design, writes directly to the `users` collection (creating documents, setting `emailVerified`, linking `accounts`, etc.) via its own internal driver calls, entirely outside `lib/data/*`.
- Structural seed: `lib/data/users.ts # users collection repository` — implies the app also owns writes to this same collection (e.g., persisting `selfieUrl` per FR-03/AD-4).

**Scenario:**
- **Unit A** treats the adapter as an unstated, pragmatic exception and writes `lib/data/users.ts#updateSelfie()` as a `$set`-based partial `updateOne` — safe, leaves adapter-managed fields alone.
- **Unit B**, reading the convention literally ("Mongo writes happen only inside `lib/data/*`"), builds a repository function that does a full-document read-modify-`replaceOne` to "own" the users collection the way the convention implies, since it never anticipated a second writer. The first time this runs after the adapter has added an `accounts`-linkage or `emailVerified` field, that field is silently dropped.

**Incompatibility:** The convention text doesn't carve out the NextAuth adapter as an exception to "writes only happen inside `lib/data/*`," yet the adapter unavoidably writes to `users` outside that layer. Two builders can reach opposite, both-plausible conclusions about how defensive `lib/data/users.ts` needs to be, and only one of them survives contact with the adapter's actual document shape.

**Fix:** Add a Consistency Convention line carving out the explicit exception: "The `@next-auth/mongodb-adapter` writes directly to `users` for auth-managed fields (id, email, emailVerified, image, account links); `lib/data/users.ts` must only ever use partial (`$set`) updates for app-owned fields (e.g., `selfieUrl`) and must never `replaceOne`/overwrite the document."

---

## Finding 4 — `vto_tasks` status has no transition guard: concurrent/out-of-order writes can regress a terminal status (Medium-High)

**AD text relied on:**
- AD-2: "All VTO task creation/status logic lives in `lib/services/vtoTask.ts`, backed by exactly one `vto_tasks` MongoDB collection." — this guarantees a single *file*, not a single *write pattern*.

**Scenario:**
- **Unit A** implements `updateStatus()` as `findOneAndUpdate({ taskId, status: 'processing' }, { $set: { status, errorCode } })` — a guarded transition that only applies if the task is still in-flight.
- **Unit B** implements the same function as a blind `updateOne({ taskId }, { $set: { status, errorCode } })` — simpler, still "lives in vtoTask.ts," still "backed by exactly one collection."

**Incompatibility:** Both satisfy AD-2's literal text. Only Unit A's version is safe against the real race the spine itself invites: `GET /api/vto-tasks/[id]` is polled repeatedly by the client (per AD-2's own client contract), and if that GET handler calls YouCam and persists the result each time, two in-flight polls can return out of order (network jitter, retry) — a slow "processing" response arriving after a fast "succeeded" response would clobber a terminal state back to non-terminal under Unit B's implementation, causing the client to poll forever or show a stale result.

**Fix:** Add to AD-2 (or a new Consistency Convention row): status writes must be guarded, monotonic transitions (e.g., only overwrite when current status is non-terminal), and terminal states (`succeeded`/`failed`) are immutable once set.

---

## Finding 5 — `vto_tasks` creation has no idempotency contract (Medium)

**AD text relied on:** AD-2's rule only says task creation logic lives in one file; it says nothing about what constitutes a duplicate request.

**Scenario:**
- **Unit A** adds a unique index on `(userId, srcCloudinaryUrl, refCloudinaryUrl, style)` and upserts, so a double-click/retry on `POST /api/vto-tasks` returns the existing task.
- **Unit B** does a plain `insertOne` per call — a double-submit (slow network, user impatience, browser back/forward) creates two billed YouCam calls for the identical request, directly undermining the Cost Management NFR that AD-3 exists to serve.

**Fix:** Either add an explicit idempotency rule to AD-2/AD-3, or add a Deferred item explicitly punting on it (currently the spine is silent, which reads as "not a concern" rather than "explicitly out of scope").

---

## Finding 6 — `userId` type/shape is unspecified: writer and reader can disagree on ObjectId vs string (Medium-High)

**AD text relied on:** ER diagram lists `VTO_TASK` fields as `taskId, status, errorCode, srcCloudinaryUrl, refCloudinaryUrl, style` — **no `userId` field is shown at all**, despite the relationship `USER ||--o{ VTO_TASK : creates` requiring one to exist. The convention only says "Auth session read via NextAuth's server-side session helper" — it doesn't say what type the resulting id is stored/queried as.

**Scenario:**
- **Unit A** (task creation, FR-04) stores `userId: new ObjectId(session.user.id)` in `vto_tasks`, matching the native `_id` type of the `users` collection.
- **Unit B** (task listing/history, a later story) queries `vtoTasks.find({ userId: session.user.id })` — a bare string, since `session.user.id` from NextAuth is a string.

**Incompatibility:** The MongoDB driver does not coerce between `ObjectId` and string in queries. Unit B's query silently returns zero results against Unit A's data — a correctness bug invisible in isolated unit tests (each side mocks the other) and only surfacing on integration.

**Fix:** Add `userId` to the ER diagram's `VTO_TASK` entity and state its type explicitly in a Consistency Convention row (e.g., "foreign keys into `users` are stored as the same type as `_id` — Mongo `ObjectId` — never as the bare NextAuth session id string").

---

## Finding 7 — `GET /api/vto-tasks/[id]` has no stated ownership check — IDOR gap (High)

**AD text relied on:** AD-3's rule text is scoped to one route: "`POST /api/vto-tasks` requires an authenticated session, checked server-side inside the route handler." It is silent on `GET /api/vto-tasks/[id]`.

**Scenario:**
- **Unit A** builds `GET /api/vto-tasks/[id]` with the same session check as POST, plus a check that `task.userId === session.user.id`, because that seemed like the obvious secure default.
- **Unit B** builds `GET /api/vto-tasks/[id]` as an open read (any authenticated — or, reading AD-3 maximally literally, even anonymous — request can poll any task id), since AD-3's "requires an authenticated session" clause names only the POST route and AD-2's client contract just says the client "calls `GET /api/vto-tasks/[id]`" with no ownership language.

**Incompatibility:** Both are defensible readings of the spine. Unit B is a real IDOR: task ids are YouCam's own `task_id` (per the Data & formats convention), and if that id is ever exposed in a URL, log, or shared "look at my try-on" link, any other session can poll it and read another user's VTO result/selfie-derived image.

**Fix:** Extend AD-3 (or add a new AD) to explicitly require session-scoped ownership checks on `GET /api/vto-tasks/[id]`, not just auth-gating on the POST.

---

## Finding 8 — Error-code-to-copy governance covers only YouCam errors, not validation/auth/timeout errors (Medium)

**AD text relied on:** AD-6's binds are scoped to FR-06 only and its rule is explicitly "Every **YouCam** error code maps to fixed copy in exactly one place." AD-5 (validation) and AD-3 (auth-gating) have equivalent failure classes but no equivalent single-map requirement.

**Scenario:**
- **Unit A** (upload route, AD-5) invents route-local codes like `IMAGE_TOO_LARGE`, `UNSUPPORTED_FORMAT` and maps them to copy inline in the route handler.
- **Unit B** (profile page component) and **Unit C** (VTO upload component) each separately render inline error text for those same codes, coined independently since nothing designates one file as their canonical map (unlike AD-6 for YouCam codes) — producing different wording for identical failures, plus no defined home for a client-invented pseudo-code like `TIMEOUT` when a YouCam task never resolves (AD-6's map is keyed to actual YouCam error codes, not client-side polling timeouts).

**Fix:** Extend the "exactly one place" requirement to all route-local error codes (validation, auth, timeout), not just YouCam's, and explicitly assign a home for a client-side "task never resolved" pseudo-error.

---

## Finding 9 — "Polling cadence" has no designated home despite AD-2 claiming to prevent its duplication (Medium)

**AD text relied on:** AD-2 "Prevents: polling cadence ... being reimplemented differently in more than one place," but the *rule* only pins down where server-side task creation/status logic lives — polling cadence is inherently a client-side concern (a `setInterval`/`useEffect` loop in a Client Component), which is a different layer than `lib/services/vtoTask.ts`.

**Scenario:**
- **Unit A** exports a `POLL_INTERVAL_MS` constant from `lib/services/vtoTask.ts` and imports it client-side (services are "plain TypeScript," importable anywhere, per the Design Paradigm section).
- **Unit B** hardcodes `setInterval(poll, 2500)` directly inside the stylist result Client Component, reasoning that AD-2's rule text only names "task creation/status logic," not the client's poll loop.

**Incompatibility:** Both satisfy the rule's literal wording; only one satisfies the "prevents" clause's intent. If a third story later adds a second polling UI (e.g., a "my try-ons" history page), it's a coin flip whether a shared constant already exists to reuse.

**Fix:** State explicitly where the poll-interval constant lives and that all client polling call sites must import it from there.

---

## Finding 10 — Document field casing is unspecified (Low-Medium)

**AD text relied on:** The naming convention row covers component casing, collection casing, and route-folder casing — but not the casing of fields *within* a Mongo document. The ER diagram uses camelCase (`taskId`, `srcCloudinaryUrl`) as an illustrative example, not a stated rule.

**Scenario:** Unit A (users repository) writes camelCase fields (`selfieUrl`, matching TS/JS convention and the ER diagram). Unit B (vto_tasks repository), reasoning that Mongo/collection-naming culture in this same table is snake_case (`vto_tasks`), writes snake_case fields (`src_cloudinary_url`). Both are "compliant" since no rule governs field casing; the two repositories now have visibly inconsistent document shapes, and any later shared serialization/DTO layer has to special-case each.

**Fix:** Add one line to the naming-convention table: "Document fields: camelCase, matching TypeScript interface field names."

---

## Finding 11 — The mandated error envelope doesn't carve out the NextAuth catch-all route (Low)

**AD text relied on:** "All API route error responses use one envelope: `{ error: { code: string, message: string } }`" — stated without qualification, but `app/api/auth/[...nextauth]/route.ts` is NextAuth v4's own handler, which returns its own redirect/query-param-based error format (`?error=CredentialsSignin`) that cannot be reshaped into the custom envelope without wrapping NextAuth's internal callbacks.

**Scenario:** Unit A treats the auth route as an implicit, unstated exception (pragmatic). Unit B, read literally, spends effort building a custom sign-in error page/interceptor to force NextAuth errors into the `{error:{code,message}}` shape, work that isn't actually needed and diverges from how every other NextAuth v4 hackathon integration handles it.

**Fix:** Add a one-line carve-out: "The envelope convention applies to all app-owned API routes; `/api/auth/[...nextauth]` follows NextAuth v4's own response conventions."

---

## Summary Table

| # | Finding | Severity | Type of fix needed |
| --- | --- | --- | --- |
| 1 | Service-layer bypass defeats AD-3 auth gate | High | Tighten AD-3 / new AD |
| 2 | TREND entity: JSON file vs Mongo collection contradiction | High | New AD, resolve now |
| 3 | `users` collection dual-writer (NextAuth adapter vs `lib/data/users.ts`) | High | New Consistency Convention line |
| 4 | `vto_tasks` status race / no transition guard | Medium-High | Tighten AD-2 |
| 5 | `vto_tasks` creation idempotency unspecified | Medium | New AD or explicit Deferred item |
| 6 | `userId` type/shape unspecified (ObjectId vs string), missing from ER diagram | Medium-High | Fix ER diagram + Consistency Convention |
| 7 | `GET /api/vto-tasks/[id]` ownership check unstated (IDOR) | High | Extend AD-3 |
| 8 | Error-code-to-copy governance covers only YouCam codes | Medium | Extend AD-6 |
| 9 | Polling cadence has no designated home | Medium | Tighten AD-2 |
| 10 | Document field casing unspecified | Low-Medium | New Consistency Convention line |
| 11 | Error envelope doesn't carve out NextAuth route | Low | New Consistency Convention line |
