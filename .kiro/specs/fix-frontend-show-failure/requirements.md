# Requirements: fix-frontend-show-failure

## Document Info
- Feature: fix-frontend-show-failure
- Status: Draft
- Created: 2026-05-27
- Issue: #71

## Overview

kusa の起動時、Tauri window builder は `.visible(false)` で window を作成し、frontend の `getCurrentWindow().show()` が唯一の visibility 確保手段となっている。`src/App.tsx:655` および `src/App.tsx:720` ではこの `show()` が空 catch (`.catch(() => {})`) で握りつぶされており、失敗した場合に window が永久に hidden のままになる致命的な問題がある。本機能では retry + フォールバック付きヘルパー `ensureWindowVisible` を導入し、可観測性と復元性を確保する。

## Functional Requirements

### Core Behavior

- **FR-001**: The kusa frontend shall expose a helper function `ensureWindowVisible(retries?: number): Promise<void>` that ensures the current Tauri window becomes visible.
- **FR-002**: When `ensureWindowVisible` is invoked, the system shall obtain the current window via `getCurrentWindow()` from `@tauri-apps/api/window` once and reuse the reference for the duration of the call.
- **FR-003**: When `ensureWindowVisible` is invoked, the system shall attempt up to `retries` show cycles (default `retries = 3`).
- **FR-004**: When a show cycle begins, the system shall call `await window.show()`.
- **FR-005**: When `window.show()` resolves without error, the system shall call `await window.isVisible()` to confirm visibility.
- **FR-006**: When `window.isVisible()` returns `true`, the system shall return from `ensureWindowVisible` without further retries.
- **FR-007**: When `window.isVisible()` returns `false` after a successful `show()` call, the system shall continue to the next retry cycle.
- **FR-008**: When retries are exhausted without visibility confirmation, the system shall execute the final fallback sequence: `await window.setFocus()`, `await window.center()`, `await window.show()` — in that exact order.

### User Interactions

- **FR-010**: When the onMount loading timeout (2000ms) fires, the system shall call `await ensureWindowVisible()` in place of the previous `getCurrentWindow().show().catch(() => {})` at `src/App.tsx:655`.
- **FR-011**: When the onMount `finally` block executes, the system shall call `await ensureWindowVisible()` in place of the previous `getCurrentWindow().show().catch(() => {})` at `src/App.tsx:720`.
- **FR-012**: When `ensureWindowVisible` is awaited in `onMount`, the system shall not let an unhandled rejection escape; the helper shall not throw under any code path.

### Edge Cases

- **FR-020**: When `ensureWindowVisible` is called with `retries < 1`, the system shall skip the retry loop and execute only the final fallback sequence.
- **FR-021**: While the loading timeout fallback path and the `finally` path both invoke `ensureWindowVisible`, the system shall accept redundant calls — repeated invocations are idempotent (calling `show()` on an already visible window is a no-op).

### Error Handling

- **FR-030**: If `await window.show()` rejects during a retry cycle, the system shall log via `console.error("[kusa] window.show() failed (attempt N/total):", err)` where N is the 1-indexed attempt number.
- **FR-031**: If `await window.isVisible()` resolves with `false` after a successful `show()`, the system shall log via `console.warn("[kusa] show() succeeded but isVisible=false, attempt N")`.
- **FR-032**: When the system proceeds from one retry attempt to the next, it shall await `100 * (attempt + 1)` milliseconds before the next cycle (100ms, 200ms, 300ms for 3 retries).
- **FR-033**: If the final fallback sequence throws at any step, the system shall catch the error and log via `console.error("[kusa] FATAL: cannot show window:", err)` and return normally (no rethrow).

## Non-Functional Requirements

### Performance

- **NFR-001**: The retry backoff shall be increasing by 100ms per attempt: `delay = 100 * (attempt + 1)` where `attempt` is 0-indexed.
- **NFR-002**: When the window becomes visible on the first attempt, the system shall introduce no extra delay beyond a single `show()` + `isVisible()` round-trip.
- **NFR-003**: The helper shall add no synchronous CPU work beyond the existing `show()` call path on the success-first-try case.

### Code Quality

- **NFR-010**: The helper shall live at `src/utils/window-visibility.ts` to keep `App.tsx` focused on orchestration and to enable isolated unit testing.
- **NFR-011**: The helper module shall depend only on `@tauri-apps/api/window` (no new Tauri plugins, no new npm dependencies).
- **NFR-012**: The helper shall be implemented in TypeScript with explicit return type `Promise<void>`.

### Testability

- **NFR-020**: The helper shall be covered by vitest unit tests that mock `getCurrentWindow()` and exercise: success on first try, success after retry (e.g. `isVisible=false` then `true`), full retry exhaustion → fallback success, and full failure → fatal logging path.
- **NFR-021**: Tests shall verify that `console.warn` and `console.error` are called with the expected messages for each failure branch.
- **NFR-022**: Tests shall verify the backoff delays elapse as specified (100ms/200ms/300ms) using vitest fake timers.

### Compatibility

- **NFR-030**: The helper shall rely only on Tauri v2 `Window` APIs already used elsewhere in the app: `show()`, `isVisible()`, `setFocus()`, `center()`.
- **NFR-031**: The change shall not modify `src-tauri/` — the backend `.visible(false)` window builder policy is intentionally preserved per issue #69.

## Acceptance Criteria

1. `src/App.tsx` no longer contains `getCurrentWindow().show().catch(() => {})` at any location.
2. `src/utils/window-visibility.ts` exports `ensureWindowVisible` and is imported by `App.tsx`.
3. Both former call sites use `await ensureWindowVisible()`.
4. `bun test` (vitest) passes; new tests cover the four scenarios listed in NFR-020.
5. `bun run tauri build` (or equivalent type-check / build) succeeds with no new TypeScript errors.
6. Issue #71 is referenced via `Closes #71` in the PR body.
7. No changes to `src-tauri/` directory.

## Traceability

| requirements-init item | Expanded |
|---|---|
| FR-001 (helper signature) | FR-001, FR-002, FR-003 |
| FR-002 (call site 655) | FR-010 |
| FR-003 (call site 720) | FR-011 |
| FR-004 (isVisible verification) | FR-005, FR-006, FR-007 |
| FR-005 (error logging) | FR-030 |
| FR-006 (isVisible=false warning) | FR-031 |
| FR-007 (final fallback) | FR-008, FR-033 |
| FR-008 (fatal logging) | FR-033 |
| NFR-001 (backoff) | NFR-001, FR-032 |
| NFR-002 (no plugin) | NFR-011 |
| NFR-003 (async signature) | NFR-012, FR-012 |
| NFR-004 (file location) | NFR-010 |
| NFR-005 (test coverage) | NFR-020, NFR-021, NFR-022 |
| C-001 (no backend) | NFR-031 |
| C-002 (isVisible API) | NFR-030 |
| C-003 (no --no-verify) | (process rule, enforced at commit) |
| C-004 (Conventional Commits) | (process rule, enforced at commit) |

## Out of Scope

- Adding a UI-level error dialog (e.g., via `tauri-plugin-dialog`) on fatal show failure — issue #71 explicitly defers this.
- Refactoring `onMount` beyond replacing the two `show()` call sites.
- Modifying Tauri window builder defaults in `src-tauri/` (preserved per issue #69).
