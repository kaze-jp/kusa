# Implementation Tasks: fix-frontend-show-failure

## Document Info
- Feature: fix-frontend-show-failure
- Total tasks: 4
- Parallelizable: 1
- Created: 2026-05-27
- Issue: #71

## Task Dependency Graph

```
T-001 (helper + tests)
   │
   ▼
T-002 (App.tsx integration)
   │
   ▼
T-003 (typecheck + bun test)
   │
   ▼
T-004 (manual smoke test)  (P)
```

## Parallel Execution Groups

- Group A: T-001 (independent — net-new files)
- Group B: T-002 (depends on T-001)
- Group C: T-003 (depends on T-002)
- Group D: T-004 manual verification — can be deferred and is non-blocking once T-003 passes.

There is effectively no parallelism within this fix because everything funnels through `src/App.tsx`. T-001 is logically self-contained but T-002 needs the helper exported.

## Tasks

### T-001: Implement `ensureWindowVisible` helper with vitest unit tests
- **Description**:
  - Create `src/utils/window-visibility.ts` exporting `ensureWindowVisible(retries?: number): Promise<void>` per design.
  - Create `src/utils/window-visibility.test.ts` with vitest unit tests covering: success-first-try, success-after-isVisible-false, success-after-show-throws, retries-exhausted-then-fallback-success, full-failure-fatal-log, `retries=0` skip path.
  - Use `vi.mock("@tauri-apps/api/window", …)` to inject a mock window with `vi.fn()` methods (`show`, `isVisible`, `setFocus`, `center`).
  - Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(...)` for the backoff delays.
  - Spy on `console.warn` and `console.error` to assert log messages.
- **Files**:
  - `src/utils/window-visibility.ts` (new)
  - `src/utils/window-visibility.test.ts` (new)
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] `bun test src/utils/window-visibility.test.ts` passes with all six cases green.
  - [ ] Helper has explicit return type `Promise<void>` and never rejects.
  - [ ] Helper depends only on `@tauri-apps/api/window`.
  - [ ] Backoff is `100 * (i + 1)` ms (i 0-indexed).
  - [ ] Fallback executes `setFocus` → `center` → `show` in that order.
- **Tests**: see Description.
- **Effort**: Medium

### T-002: Wire `ensureWindowVisible` into App.tsx onMount
- **Description**:
  - Add `import { ensureWindowVisible } from "./utils/window-visibility";` near the top of `src/App.tsx`.
  - Inside the loadingTimeout callback (line ~650), convert the callback to `async` and replace `getCurrentWindow().show().catch(() => {});` with `await ensureWindowVisible();`.
  - In the `finally` block (line ~720), replace `getCurrentWindow().show().catch(() => {});` with `await ensureWindowVisible();`.
  - Confirm there are no other `getCurrentWindow().show()` calls in `src/App.tsx`; if found, also route through the helper.
- **Files**:
  - `src/App.tsx` (modify)
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] `grep -n "show().catch" src/App.tsx` returns nothing.
  - [ ] `grep -n "ensureWindowVisible" src/App.tsx` returns two call sites + one import.
  - [ ] No other code paths in `src/App.tsx` call `.show()` directly on the window.
  - [ ] `bun run tsc --noEmit` (or the project's typecheck script) reports no errors.
- **Tests**: Covered indirectly by manual verification in T-004; the helper has its own unit tests.
- **Effort**: Small

### T-003: Run automated checks (tests + lint + typecheck)
- **Description**:
  - Run `bun test` to execute the full vitest suite.
  - Run the project's lint / typecheck commands as defined in `package.json` (e.g., `bun run lint`, `bun run typecheck` / `tsc --noEmit`).
  - Fix any new warnings or failures caused by this change.
- **Files**: None (verification only).
- **Dependencies**: T-002
- **Acceptance Criteria**:
  - [ ] `bun test` exits 0.
  - [ ] Typecheck command exits 0.
  - [ ] No new lint errors.
- **Tests**: N/A
- **Effort**: Small

### T-004: Manual smoke test + commit + PR (P)
- **Description**:
  - Optional manual run: `bun run tauri dev` to confirm the window still appears on a normal launch.
  - Commit the changes with Conventional Commits (`fix(window): replace empty catch with ensureWindowVisible helper`).
  - Push the branch and open a PR whose body contains `Closes #71`.
- **Files**: git operations only.
- **Dependencies**: T-003
- **Acceptance Criteria**:
  - [ ] Local app launches and window appears (if dev environment available).
  - [ ] PR is open against `main` with `Closes #71` in body.
  - [ ] CodeRabbit review is requested.
- **Tests**: N/A
- **Effort**: Small

## File Conflict Matrix

| Task | Files | Conflicts With |
|------|-------|---------------|
| T-001 | `src/utils/window-visibility.ts`, `src/utils/window-visibility.test.ts` | None |
| T-002 | `src/App.tsx` | None (T-001 is a different file but T-002 must wait for T-001's export) |
| T-003 | none | n/a |
| T-004 | none | n/a |

## Requirements Traceability

| Requirement | Tasks |
|------------|-------|
| FR-001 — FR-008 (helper semantics) | T-001 |
| FR-010, FR-011 (call sites) | T-002 |
| FR-012 (no throw escapes) | T-001 |
| FR-020, FR-021 (edge cases) | T-001 |
| FR-030, FR-031, FR-032, FR-033 (logging + backoff) | T-001 |
| NFR-001 — NFR-003 (perf) | T-001 |
| NFR-010 — NFR-012 (location/types/deps) | T-001 |
| NFR-020 — NFR-022 (testability) | T-001 |
| NFR-030, NFR-031 (compatibility) | T-001, T-002 |
| Acceptance #6 (Closes #71) | T-004 |
| Acceptance #7 (no backend change) | T-001, T-002 |
