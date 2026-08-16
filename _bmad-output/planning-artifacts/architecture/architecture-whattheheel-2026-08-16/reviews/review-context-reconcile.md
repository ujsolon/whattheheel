# Reconciliation Review: ARCHITECTURE-SPINE.md vs. project-context.md

**Scope:** Fidelity check only — does the spine contradict, silently override, or misstate any standing fact/rule in `_bmad-output/project-context.md`? Code style, mermaid validity, and general architecture quality are explicitly out of scope (covered by other reviewers).

**Files compared:**
- `_bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md`
- `_bmad-output/project-context.md`

## Verdict

**Consistent — yes.** No contradictions found. The spine explicitly cites project-context.md in three places (Stack table's Jest+RTL row, `console.error` logging convention, and PascalCase/`app/components/` naming), and every checked fact lines up.

## Tech Stack Versions — checked line by line

| Item | project-context.md | ARCHITECTURE-SPINE.md | Match? |
| --- | --- | --- | --- |
| Next.js | v16.0.3 | 16.0.3 | Yes |
| TypeScript | v5 | 5 | Yes |
| React | v19.2.0 | 19.2.0 | Yes |
| Tailwind CSS | v4 | 4 | Yes |
| ESLint | v9 with `eslint-config-next` | 9 (`eslint-config-next`) | Yes |

No version drift. Everything else in the spine's Stack table (Node.js 24, MongoDB Atlas, mongodb driver, cloudinary SDK, next-auth, @next-auth/mongodb-adapter) is outside project-context.md's coverage — project-context.md is silent on these, so there's nothing to contradict.

## Rule-by-rule check

| project-context.md rule | Spine treatment | Verdict |
| --- | --- | --- |
| Client Components for interactive UI, prefer Server Components for non-interactive content | FR-02's `OverlayCanvas.tsx` (interactive manual overlay) is explicitly a Client Component; nothing else in the spine forces Client Components where Server would do | Consistent |
| Reusable components in `app/components/`, `PascalCase` naming | Consistency Conventions table: "React components: `PascalCase`, in `app/components/`"; Structural Seed: `components/ # PascalCase reusable UI` | Consistent (verbatim match) |
| `useState` for local state; avoid global state library unless necessary | Spine never introduces a global state library or client-side store; AD-2 keeps VTO task state server-side (one Mongo collection), not client global state | Consistent (no override) |
| Jest + RTL, co-located `__tests__`, `.test.tsx` naming | Stack table: "Jest + React Testing Library \| per project-context.md"; Structural Seed: `components/ # ... co-located __tests__` | Consistent (defers to project-context.md by name) |
| Errors: `try...catch`, log via `console.error`, notify user | Consistency Conventions: "Server errors logged via `console.error` (per project-context.md); user-facing copy always distinct from the logged message" | Consistent (explicit citation) |
| Avoid `alert()` for user feedback | AD-6: VTO errors "always rendered inline on the same screen (never a modal)" | Consistent (stronger than context; no modal or native alert) |
| Minimize direct DOM manipulation, prefer declarative React | Spine doesn't touch DOM-manipulation specifics (component-internals level, not architecture-spine level) | No contradiction — out of spine's altitude, not overridden |
| Secrets only via env vars, never hardcoded | Consistency Conventions: "All secrets via environment variables only, never hardcoded"; AD-1 keeps API keys server-only | Consistent, and AD-1 goes further (server-only execution) than project-context.md requires |
| TypeScript strict mode | Spine doesn't restate this, but nothing in it requires non-strict code (no `any`-shaped contracts, no loosened typing called out) | No contradiction — silent, not overridden |
| Branch naming (`feature/...`, `fix/...`), Conventional Commits, PR-before-merge | Not mentioned in the spine | Out of scope for an architecture spine (workflow-level, not structural) — not overridden, just not restated |
| Path alias `@/*`, `import type` for type-only imports, default/named export convention | Not mentioned in the spine | Same — implementation-level convention, not contradicted |

## Notable non-issues (checked, found benign)

- **Env var example inconsistency lives in project-context.md itself, not introduced by the spine.** project-context.md's security rule illustrates env vars with `NEXT_PUBLIC_...`, which is normally a client-exposed prefix and would be an odd example for "sensitive information." The spine does not repeat or inherit this; AD-1 correctly mandates that YouCam/Cloudinary/Mongo access — and by extension any secret key — stays server-only, never in a Client Component. This is pre-existing ambiguity in project-context.md, not a spine/context mismatch, so it is not counted as a finding against the spine.
- **next-auth v4.24.15 pinned alongside Next.js 16** is a version-compatibility question, but project-context.md doesn't mention next-auth at all, so there is no project-context.md fact for the spine to contradict here. (Flagging for architecture-quality reviewers, not in scope for this reconciliation.)

## Findings requiring action

None. No tech-stack version contradicts project-context.md, no language/framework/testing/quality/workflow/anti-pattern rule is contradicted, and the spine does not silently override any standing fact — where it touches a project-context.md-governed area it either matches verbatim or explicitly defers to project-context.md by name.
