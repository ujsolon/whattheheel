---
baseline_commit: NO_VCS
---

# Story 1.1: Project Scaffolding & Foundation

Status: ready-for-dev

## Story

As a developer,
I want the Next.js project scaffolded with the pinned stack and layered directory structure,
so that feature stories have a working, architecturally compliant foundation.

## Acceptance Criteria

1. **Given** no project exists, **when** `create-next-app` is run with TypeScript, Tailwind CSS, ESLint, and App Router, **then** it creates a working app on the latest available Next.js 16.x patch at execution time. Do not blindly pin the architecture’s stale 16.0.3 baseline.
2. **Given** the scaffolded app, **when** `package.json` is inspected, **then** it contains `"engines": { "node": "24.x" }`.
3. **Given** the layered architecture, **when** base directories are created, **then** `app/api/`, `app/components/`, `lib/services/`, `lib/data/`, `lib/external/`, and `public/` exist and establish the one-way Route Handler → Service → Data/External boundary.
4. **Given** the scaffolded app, **when** `npm run dev` is started, **then** the root page renders without errors.
5. Jest and React Testing Library are configured: tests are co-located in `__tests__/`, use `*.test.tsx`, and each future component must receive at least a render-smoke test.

## Tasks / Subtasks

- [ ] Scaffold the application (AC: 1)
  - [ ] Verify the currently available stable Next.js release remains within 16.x; use `create-next-app` with TypeScript, Tailwind, ESLint, App Router, and the `@/*` alias.
  - [ ] Keep the project at the repository root; do not use a `src/` directory because the approved architecture and acceptance criteria require root `app/` and `lib/` paths.
  - [ ] Confirm strict TypeScript is enabled and baseline scripts work.
- [ ] Apply foundation configuration (AC: 2–3)
  - [ ] Add Node 24 engine constraint to `package.json`.
  - [ ] Add the empty architectural directories with tracked placeholders where needed; do not add feature logic or external-service dependencies.
  - [ ] Preserve App Router conventions and the `@/*` alias.
- [ ] Configure quality tooling (AC: 5)
  - [ ] Install and configure Jest plus React Testing Library for a Next.js App Router project.
  - [ ] Add a test command and a minimal smoke test for the generated root page using the required co-located naming convention.
- [ ] Verify the foundation (AC: 4–5)
  - [ ] Run lint and tests successfully.
  - [ ] Start the development server and verify a successful root-page response without build/runtime errors.

## Dev Notes

### Scope boundary

This story creates only the foundation. Do **not** install or configure MongoDB, Cloudinary, NextAuth, bcryptjs, YouCam, API routes beyond structural directories, database collections, VTO logic, or feature UI. Those belong to Stories 1.2–2.5. Keep placeholders minimal and non-functional.

### Architecture compliance

- Use Next.js App Router, TypeScript 5, Tailwind CSS 4, ESLint 9 with `eslint-config-next`, and a compatible React version selected by the chosen Next.js 16.x patch.
- Maintain one-way layering: Route Handlers own HTTP request/response concerns; `lib/services/` holds portable plain TypeScript business logic and must not import `next/server`; `lib/data/` and `lib/external/` are the only future homes for database drivers, SDKs, and external API calls.
- Prefer Server Components. Add `'use client'` only to interactive components in later stories.
- Do not create secrets. Later private credentials must be server-only environment variables, never `NEXT_PUBLIC_` prefixed.

### Project conventions

- TypeScript remains `strict: true`; use `import type` for type-only imports.
- Page components default-export; components and hooks use named exports. Reusable components belong in `app/components/` and use PascalCase filenames.
- Use local React state only when future interactive work needs it. Do not introduce a global state library.
- No Prettier is configured. `npm run lint` is required.
- The UI contract is Tailwind-only, dark-mode-only, mobile-first; do not add a component library or prematurely build styling tokens in this foundation story.

### Testing requirements

- Jest + React Testing Library only; co-locate tests in `__tests__/` beside their source.
- Test files use `.test.tsx`. Each newly introduced component needs at least a render-smoke test.
- Validate using the test command, `npm run lint`, and a dev-server root-page smoke check. Next.js 16 does not run lint automatically as part of `next build`, so lint is an explicit check.

### Project Structure Notes

Expected initial structure includes:

```text
app/
  api/
  components/
  layout.tsx
  page.tsx
lib/
  services/
  data/
  external/
public/
```

Empty directories are not retained by Git; use minimal tracked placeholders only where required. Do not add speculative modules.

### Latest Technical Information

At implementation time, verify the current Next.js release instead of using the old 16.0.3 planning baseline. The official installation guidance confirms that `create-next-app` supports the required TypeScript, Tailwind, ESLint, App Router, and `@/*` defaults; it also notes the Next.js 16 lint behavior above. [Source: Next.js Installation documentation, accessed 2026-08-17]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Project Scaffolding & Foundation]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-whattheheel-2026-08-16/ARCHITECTURE-SPINE.md#Design Paradigm and Structural Seed]
- [Source: _bmad-output/project-context.md#Technology Stack, Testing Rules, and Code Quality & Style Rules]
- [Source: https://nextjs.org/docs/app/getting-started/installation]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5.6 Terra)

### Debug Log References

- 2026-08-17: Git baseline unavailable because the sandbox does not trust the repository owner; recorded `NO_VCS` per workflow.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/1-1-project-scaffolding-foundation.md`
