---
project_name: 'whattheheel'
user_name: 'usolonjr'
date: '2026-08-10'
sections_completed:
 - 'technology_stack'
 - 'language_rules'
 - 'framework_rules'
 - 'testing_rules'
 - 'quality_rules'
 - 'workflow_rules'
 - 'anti_patterns'
status: 'complete'
rule_count: 28
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework:** Next.js v16.0.3
- **Language:** TypeScript v5
- **UI Library:** React v19.2.0
- **Styling:** Tailwind CSS v4
- **Linting:** ESLint v9 with `eslint-config-next`

## Critical Implementation Rules

### Language-Specific Rules

- **TypeScript Strict Mode:** `strict: true` is enabled in `tsconfig.json`. All new code must be strictly typed.
- **Path Aliases:** The path alias `@/*` is configured to point to the root directory. Use it for cleaner imports (e.g., `import MyComponent from '@/components/MyComponent'`).
- **Import/Export:** Use `import type` for type-only imports. Use default exports for page components and named imports for other components and hooks.
- **Error Handling:** Use `try...catch` blocks for asynchronous operations. Log errors to the console using `console.error` and notify the user.

### Framework-Specific Rules
- **Component Type:** Use Client Components (`'use client'`) for interactive UI. Prefer Server Components for non-interactive content to improve performance.
- **Component Structure:** Reusable components are located in `app/components/` and named with `PascalCase`. The project follows the Next.js App Router file-based routing.
- **State Management:** Use the `useState` hook for local component state. Avoid adding a global state management library unless necessary.
- **Hooks Usage:** Utilize `useState` for managing component state and `useRef` for direct DOM access when needed.

### Testing Rules
- **Framework:** Jest and React Testing Library will be used for component testing.
- **Test Location:** Test files will be co-located with the source code in a `__tests__` directory.
- **File Naming:** Test files must be named with the `.test.tsx` suffix (e.g., `MyComponent.test.tsx`).
- **Basic Tests:** Every synchronous component should have a basic Jest/React Testing Library test that checks whether it renders without crashing. Async Server Components receive E2E coverage instead; extract synchronous presentational children for focused Jest/RTL coverage where useful.

### Code Quality & Style Rules
- **Linting:** The project enforces the `eslint-config-next` rules. Ensure all code passes the linter by running `npm run lint`.
- **Formatting:** A specific formatter like Prettier is not configured. Adhere to the existing code style for consistency.
- **Naming Conventions:** React components and their corresponding files must be named using `PascalCase` (e.g., `MyComponent.tsx`).
- **Code Organization:** Keep reusable components in the `app/components/` directory.

### Development Workflow Rules
- **Branch Naming:** New features should be developed in branches named `feature/<short-description>` (e.g., `feature/add-login-page`). Bug fixes should be in `fix/<short-description>`.
- **Commit Message Format:** Commit messages should follow the Conventional Commits specification (e.g., `feat: add user authentication`, `fix: correct login button color`).
- **Pull Requests:** Before merging to `main`, a pull request should be created for review.

### Critical Don't-Miss Rules
- **Security:** Never hardcode sensitive information (e.g., API keys, secrets) directly into the codebase. Always use environment variables (e.g., `process.env.NEXT_PUBLIC_...`) configured via `.env.local`.
- **User Feedback:** Avoid using native browser `alert()` for user notifications. Implement a more integrated and user-friendly UI for feedback messages.
- **Direct DOM Manipulation:** While `useRef` is available, minimize direct DOM manipulation. Prefer React's declarative approach for UI updates.
- **Client vs. Server Components:** Be mindful of when to use `'use client'`. Favor Server Components for rendering static or less interactive content to leverage Next.js's performance optimizations.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review quarterly for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-08-10
