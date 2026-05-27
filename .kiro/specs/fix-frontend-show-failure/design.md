# Technical Design: fix-frontend-show-failure

## Document Info
- Feature: fix-frontend-show-failure
- Status: Approved
- Created: 2026-05-27
- Requirements: ./requirements.md
- Issue: #71

## Architecture Overview

The fix introduces one small helper module on the SolidJS side and replaces two unsafe call sites in `src/App.tsx`. Backend (`src-tauri/`) is intentionally untouched: per issue #69, the Tauri window is created with `.visible(false)` and the frontend retains exclusive responsibility for making the window visible. The helper centralizes this responsibility, adds retry + observability, and isolates the logic for unit testing.

```
┌────────────────────────────────────────────────────────────┐
│ src-tauri (untouched)                                      │
│   window builder: .visible(false)   ← issue #69 policy     │
└────────────────────────────────────────────────────────────┘
                          │ window handle
                          ▼
┌────────────────────────────────────────────────────────────┐
│ src/App.tsx :: onMount()                                   │
│                                                             │
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │ loadingTimeout (2s)  │    │ finally block           │   │
│  │  ↓                   │    │  ↓                      │   │
│  │ await ensureWindow…  │    │ await ensureWindow…     │   │
│  └──────────────────────┘    └─────────────────────────┘   │
└──────────────┬───────────────────────────┬─────────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────────────────────────────────────┐
│ src/utils/window-visibility.ts                             │
│                                                             │
│  ensureWindowVisible(retries = 3):                          │
│    for i in 0..retries:                                     │
│      try: await show(); if await isVisible(): return        │
│           else: console.warn                                │
│      catch: console.error                                   │
│      await sleep(100 * (i+1))                               │
│    try: await setFocus(); await center(); await show()      │
│    catch: console.error("FATAL")                            │
└────────────────────────────────────────────────────────────┘
```

## Component Design

### Component: `ensureWindowVisible` helper

- **Purpose**: Provide a defensive, observable, retry-driven path to make the Tauri window visible. Replace empty `.catch(() => {})` patterns with a function that logs every failure and tries a strong fallback.
- **Location**: `src/utils/window-visibility.ts` (new file). The `src/utils/` directory is new.
- **Dependencies**: `@tauri-apps/api/window` (only).
- **Interface**: Default-free named export `ensureWindowVisible(retries?: number): Promise<void>`. The function is exported as a named export so vitest tests can import and mock its dependency.

### Component: `App.tsx` (modified)

- **Purpose**: Replace two unsafe `getCurrentWindow().show().catch(() => {})` invocations with awaited calls to the new helper.
- **Location**: `src/App.tsx`
- **Dependencies**: Add an import for `ensureWindowVisible` from `./utils/window-visibility`.
- **Changes**:
  - Line ~655 (loadingTimeout callback): change the inner callback from sync to async (`async () => { … await ensureWindowVisible(); }`) so the await is honored. Returning a promise from `setTimeout` is fine; nothing relies on the callback's return value.
  - Line ~720 (`finally` block): replace `getCurrentWindow().show().catch(() => {})` with `await ensureWindowVisible();`. The enclosing function (`onMount`'s async callback) already supports `await`.

## API Contracts

### `ensureWindowVisible(retries?: number): Promise<void>`

- **Signature**:
  ```typescript
  export async function ensureWindowVisible(retries?: number): Promise<void>
  ```
- **Input**:
  - `retries` (optional, default `3`): integer, number of show attempts before falling back. Values `< 1` skip the retry loop and execute only the final fallback.
- **Output**: Resolved `Promise<void>`. The function never rejects — all errors are caught and logged.
- **Behavior**:
  1. Obtain the current window via `getCurrentWindow()`.
  2. For `i` in `[0, retries)`:
     a. `try { await win.show(); const visible = await win.isVisible(); if (visible) return; console.warn(\`[kusa] show() succeeded but isVisible=false, attempt ${i + 1}\`); } catch (err) { console.error(\`[kusa] window.show() failed (attempt ${i + 1}/${retries}):\`, err); }`
     b. `await new Promise(r => setTimeout(r, 100 * (i + 1)));`
  3. Final fallback (single try/catch block): `await win.setFocus(); await win.center(); await win.show();`
  4. On any throw within the fallback: `console.error("[kusa] FATAL: cannot show window:", err);` and return.
- **Errors**: None thrown. All errors are caught and logged.
- **Example**:
  ```typescript
  await ensureWindowVisible();           // uses default retries = 3
  await ensureWindowVisible(5);          // 5 retries
  await ensureWindowVisible(0);          // skip retries, go straight to fallback
  ```

## Data Models

No new data models. The helper relies on the Tauri `Window` object returned by `getCurrentWindow()` which already exposes `show()`, `isVisible()`, `setFocus()`, `center()` in the v2 API.

## State Management

No state. The helper is a stateless side-effecting function. It does not interact with SolidJS signals/stores. The visibility state lives in the OS window manager.

## Error Handling Strategy

| Failure Mode | Detection | Action | User Impact |
|---|---|---|---|
| `show()` throws | `try/catch` around `await win.show()` | `console.error` with attempt N/total; back off; retry | None visible; logged for debugging |
| `show()` resolves but `isVisible()` false | Post-show check | `console.warn` with attempt N; back off; retry | None visible; logged for debugging |
| Retries exhausted | Loop terminates | Fallback chain `setFocus + center + show` | Often recovers; aggressive last-ditch effort |
| Fallback also throws | `try/catch` around fallback chain | `console.error("FATAL")`; function returns | Window stays hidden; rest of app continues |

The helper is intentionally non-throwing. Both call sites in `App.tsx` are in code paths that must continue (loading timeout fallback, `finally` cleanup); a thrown error would itself be a regression.

## Testing Strategy

### Unit tests (vitest) — `src/utils/window-visibility.test.ts`

The Tauri import is mocked via `vi.mock("@tauri-apps/api/window", …)` exposing a `mockWindow` whose methods are `vi.fn()`. The same pattern is used elsewhere in the codebase for `@tauri-apps/api` mocking.

Test cases:

1. **Success on first try**: `show()` resolves, `isVisible()` returns `true`. Expect: `show` called once, `isVisible` called once, no `setFocus`/`center` calls, no `console.warn`/`console.error`.
2. **Success after one retry due to isVisible=false**: `isVisible` returns `false` then `true`. Expect: `show` called twice, one `console.warn` containing `attempt 1`, no `console.error`, fallback not invoked.
3. **Success after retry due to thrown show()**: `show` throws on first call, succeeds on second; `isVisible` returns `true` on second call. Expect: one `console.error` with `attempt 1/3`, `show` called twice, fallback not invoked.
4. **Retries exhausted; fallback succeeds**: all 3 retries fail (e.g., `isVisible` always `false`). Expect: 3 `console.warn` calls, then `setFocus` + `center` + `show` called once each, no `FATAL` log.
5. **Full failure; fallback throws**: retries fail and fallback `setFocus` throws. Expect: one `FATAL` `console.error`, function returns normally (no unhandled rejection).
6. **`retries = 0`**: loop body never runs; fallback executes directly. Expect: no `warn`/`error` from the retry loop; fallback `setFocus + center + show` called.

Timer-sensitive tests use `vi.useFakeTimers()` and advance manually to verify the backoff schedule. Tests use `await vi.advanceTimersByTimeAsync(...)` to flush awaited timer promises.

### Manual verification

After implementation, smoke-test by running `bun run tauri dev` and observing the window appears in normal conditions. Failure paths are hard to reproduce manually without injecting a broken window state plugin; the unit tests are the primary safety net.

## Security Considerations

No authentication, no I/O. The helper interacts only with the local OS window manager via Tauri's window API. There is no new attack surface.

## Implementation Plan (high-level)

1. Create `src/utils/window-visibility.ts` with the helper.
2. Create `src/utils/window-visibility.test.ts` with vitest unit tests (TDD: tests written before/alongside the helper).
3. Modify `src/App.tsx`:
   - Add import `import { ensureWindowVisible } from "./utils/window-visibility";`
   - Replace `getCurrentWindow().show().catch(() => {})` at line ~655 with `await ensureWindowVisible();` (mark the `setTimeout` callback as `async`).
   - Replace `getCurrentWindow().show().catch(() => {})` at line ~720 with `await ensureWindowVisible();`.
4. Run `bun test` and `bun run tsc --noEmit` (or the project's typecheck script).

## Requirements Traceability

| Req | Design element |
|---|---|
| FR-001 (helper exists) | `ensureWindowVisible` function in `src/utils/window-visibility.ts` |
| FR-002 (getCurrentWindow once) | Step 1 of Behavior: obtain `win` once, reuse |
| FR-003 (up to `retries` attempts) | For-loop `i in [0, retries)` |
| FR-004 (await show) | Behavior step 2a |
| FR-005 (await isVisible after show) | Behavior step 2a |
| FR-006 (return on visible true) | `if (visible) return;` |
| FR-007 (continue on visible false) | Loop falls through after `console.warn` |
| FR-008 (fallback setFocus→center→show) | Behavior step 3 |
| FR-010 (call site 655) | App.tsx modification, loadingTimeout |
| FR-011 (call site 720) | App.tsx modification, finally |
| FR-012 (no throw escapes) | Helper never rethrows |
| FR-020 (retries<1) | Loop body skipped; fallback runs |
| FR-021 (idempotent) | Native Tauri `show()` on visible window is no-op |
| FR-030 (error log) | Console.error in catch with `attempt N/total` |
| FR-031 (warn log) | Console.warn after isVisible=false |
| FR-032 (backoff schedule) | `setTimeout(r, 100 * (i+1))` |
| FR-033 (FATAL on fallback failure) | Fallback try/catch logs FATAL |
| NFR-001 (backoff math) | Same |
| NFR-002 (no extra delay first-try success) | Loop exits before sleep |
| NFR-003 (no extra CPU) | Only awaits + a single setTimeout per retry |
| NFR-010 (file location) | `src/utils/window-visibility.ts` |
| NFR-011 (no new deps) | Only imports `getCurrentWindow` |
| NFR-012 (Promise<void>) | Explicit return type |
| NFR-020 (vitest coverage) | Test plan above |
| NFR-021 (log assertions) | Test plan: spy `console.warn`/`console.error` |
| NFR-022 (fake timers) | Test plan: vi.useFakeTimers + advanceTimersByTimeAsync |
| NFR-030 (Tauri v2 API only) | Imports only `@tauri-apps/api/window` |
| NFR-031 (no backend change) | Design touches only frontend |
