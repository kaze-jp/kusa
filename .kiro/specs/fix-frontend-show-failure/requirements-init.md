# Feature: fix-frontend-show-failure

## Overview

Frontend の `getCurrentWindow().show()` が空 catch で握りつぶされていたのを、retry 付きヘルパー `ensureWindowVisible` に置き換える。show 失敗時にログを残し、最終的に setFocus + center + show で強制表示を試みる。これにより `.visible(false)` で作成された window が永久に hidden のままになる致命的な不具合を解消する。

## Product Context

kusa はターミナル AI 開発者向けの軽量 Markdown エディタ。CLI 起動 (`kusa file.md`)、Finder、ドラッグ&ドロップ、URL scheme など多様な起動経路を持つ。Tauri v2 で window builder は `.visible(false)` で window を作成するため、frontend の `getCurrentWindow().show()` が唯一の visibility 確保手段である。この単一障害点が失敗した場合の安全網がなく、ユーザー体験を直接損なう。

## Initial Requirements

### Functional Requirements

- **FR-001**: The kusa frontend shall provide a helper function `ensureWindowVisible(retries?: number)` that attempts to show the current Tauri window with retries and a final fallback strategy.
- **FR-002**: When the frontend completes the onMount loading timeout (2000ms) path, the system shall call `ensureWindowVisible()` instead of `getCurrentWindow().show().catch(() => {})`.
- **FR-003**: When the frontend completes the onMount `finally` block, the system shall call `ensureWindowVisible()` instead of `getCurrentWindow().show().catch(() => {})`.
- **FR-004**: When `ensureWindowVisible` attempts `window.show()`, the system shall verify visibility via `window.isVisible()` after each call and treat `isVisible=false` as a soft failure that triggers the next retry.
- **FR-005**: If `window.show()` throws an error during a retry, the system shall log the error via `console.error` with attempt number and total retries.
- **FR-006**: If `window.show()` succeeds but `isVisible()` returns false, the system shall log a warning via `console.warn` with the attempt number.
- **FR-007**: Where retries are exhausted (default 3 attempts), the system shall execute a final fallback chain `setFocus()` → `center()` → `show()` to force visibility.
- **FR-008**: If the final fallback also fails, the system shall log the fatal error via `console.error` and allow the application to continue running.

### Non-Functional Requirements

- **NFR-001**: The retry intervals shall use increasing backoff: 100ms, 200ms, 300ms (i.e. `100 * (i + 1)` where i is the 0-indexed attempt number).
- **NFR-002**: The helper shall not depend on additional Tauri plugins (no `tauri-plugin-dialog`); it must rely solely on `@tauri-apps/api/window` APIs already in use.
- **NFR-003**: The helper shall be async and return `Promise<void>`; callers shall `await` it so subsequent shutdown/state code runs after visibility is settled.
- **NFR-004**: The helper shall live in `src/utils/window-visibility.ts` to keep `App.tsx` focused on orchestration and to enable unit testing in isolation.
- **NFR-005**: The helper shall be unit tested with vitest, covering: success on first try, success after retry, warning on `isVisible=false`, final fallback execution, full failure path.

### Constraints

- **C-001**: Modifications are limited to `src/App.tsx` and a new helper file (e.g., `src/utils/window-visibility.ts`). Backend (`src-tauri/`) MUST NOT be touched — issue #69 mandates keeping `.visible(false)` as the window creation policy.
- **C-002**: The implementation depends on the Tauri v2 `getCurrentWindow().isVisible()` API.
- **C-003**: `git commit --no-verify` is forbidden.
- **C-004**: All commits must follow Conventional Commits.

### Assumptions

- **A-001**: The current `@tauri-apps/api/window` import (`getCurrentWindow`) provides `show()`, `isVisible()`, `setFocus()`, and `center()` methods in Tauri v2.
- **A-002**: Vitest is configured in the repo (verified: `"test": "vitest run"`, `vitest ^4.0.18` in package.json).
- **A-003**: Callers in `App.tsx` are inside an async context where `await ensureWindowVisible()` is acceptable (verified for both call sites in `onMount`).

### Open Questions

- **Q-001**: Should the helper expose retry/backoff parameters for future tuning, or hard-code defaults? — Default: expose `retries` parameter (matches issue suggestion); backoff stays hard-coded as 100ms × (i+1).
- **Q-002**: Is logging via `console.warn` / `console.error` sufficient in production, or do we need a Tauri-level log surface? — Default: console-only (issue explicitly accepts this).
