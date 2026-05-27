# Requirements: fix-create-window-error

## Document Info

- Feature: fix-create-window-error
- Status: Draft
- Created: 2026-05-27
- Related issue: kusa #69

## Overview

`src-tauri/src/lib.rs` の `create_window` 失敗時に `setup()` が `Ok(())` を返してしまうため、WebView 初期化失敗等が起きてもプロセスはウィンドウなしで残ってしまう。Full mode の build 失敗パスにも safe-defaults fallback を入れ、最終的に失敗した場合は `setup()` から `Err` を返して Tauri に明示的な panic を起こさせる。

## Functional Requirements

### Core Behavior

- **FR-001**: When `create_window` returns `Err`, the system shall propagate the error from `setup()` (i.e., `setup()` returns `Err`, which causes Tauri to panic at startup).
- **FR-002**: When the Full mode primary `WebviewWindowBuilder::build()` returns `Err`, the system shall attempt a safe-defaults fallback build before propagating the error.
- **FR-003**: While building the safe-defaults fallback for Full mode, the system shall use the following configuration: `WebviewUrl::default()`, `title("kusa")`, `inner_size(FULL_SIZE.width, FULL_SIZE.height)`, `decorations(true)`, `visible(false)`. No `min_inner_size` is required for the fallback.
- **FR-004**: When the Full mode safe-defaults fallback succeeds, the system shall continue execution as if the primary build had succeeded.
- **FR-005**: When the Full mode safe-defaults fallback also fails, the system shall return its `Err` from `create_window` so it can be propagated by FR-001.
- **FR-006**: The existing Peek mode → Full mode fallback (`src-tauri/src/lib.rs` lines 93–117) shall remain unchanged in observable behaviour.

### Logging / Diagnostics

- **FR-010**: When the Full mode primary build fails, the system shall log a message of the form `Failed to create full window: <error>, retrying with safe defaults` via `eprintln!` before attempting the fallback.
- **FR-011**: When `window.show()` returns `Err` after a successful build (Full mode or its fallback), the system shall log a message of the form `Failed to show window: <error>` via `eprintln!` instead of silently dropping the error.
- **FR-012**: When `create_window` returns `Err` from `setup()`, the system shall log `Fatal: failed to create window: <error>` via `eprintln!` before returning the error (preserving the existing diagnostic line).

### State Updates

- **FR-020**: The system shall not modify the `WindowModeState` value in the Full mode path (the value set before `create_window` is invoked already reflects `"full"`).
- **FR-021**: The system shall not emit a `window-mode` event from the Full mode path (only the Peek→Full fallback emits, per current behaviour).

### Edge Cases

- **FR-030**: When the Peek mode primary build succeeds, the system shall not invoke the Full mode fallback path (no behavioural change).
- **FR-031**: When the Peek mode primary build fails and its existing Full-mode fallback build also fails, the system shall return that `Err` from `create_window` so it is propagated by FR-001 (this is the existing `build()?` behaviour on line 109 — verified preserved, not regressed).

## Non-Functional Requirements

### Scope

- **NFR-001**: The fix shall modify only `src-tauri/src/lib.rs`.
- **NFR-002**: Within `src-tauri/src/lib.rs`, the fix shall change only lines 119–129 (Full mode builder) and lines 246–248 (`create_window` invocation in `setup`), plus any minimal helper additions needed to keep those edits clean.
- **NFR-003**: The fix shall not touch lines 183–191 (single-instance plugin), which is owned by sibling issue #70.

### Behavioural Invariants

- **NFR-010**: The fix shall preserve `.visible(false)` in both the primary Full-mode build and the safe-defaults fallback build.
- **NFR-011**: The fix shall preserve `min_inner_size(400.0, 300.0)` in the primary Full-mode build (only the fallback may omit it to maximise resilience).

### Testability

- **NFR-020**: Where extractable, the safe-defaults fallback configuration shall be expressed as a pure helper (or pure constants) that can be unit-tested in Rust without launching a Tauri runtime.
- **NFR-021**: The Rust test suite shall include at least one test verifying the safe-defaults configuration values (title, inner_size, decorations, visible).

### Project Rules

- **NFR-030**: All commits shall pass pre-commit hooks (no `git commit --no-verify`).
- **NFR-031**: Commit messages shall follow Conventional Commits.

## Acceptance Criteria

1. With the fix applied, when `WebviewWindowBuilder::build()` is forced to fail for the Full mode primary path, the safe-defaults fallback is attempted, and the user observes either (a) a working window from the fallback or (b) a clear panic from Tauri — never a silent zombie process.
2. With the fix applied, when both the primary and fallback builds fail, `setup()` returns `Err`, which propagates through `tauri::Builder::build().expect(...)` and causes Tauri to panic with the configured error message.
3. Unit tests for the safe-defaults configuration pass.
4. `cargo build` (and `cargo test`, where applicable) inside `src-tauri/` succeed.
5. PR body includes `Closes #69`.

## Traceability

| requirements-init item | Expanded requirements |
| --- | --- |
| FR-001 (propagate Err from setup) | FR-001, FR-012 |
| FR-002 (retry with safe defaults) | FR-002, FR-003, FR-004, FR-010 |
| FR-003 (fallback also fails → propagate) | FR-005 |
| FR-004 (log original failure reason) | FR-010 |
| FR-005 (log show failure) | FR-011 |
| FR-006 (Peek→Full fallback unchanged) | FR-006, FR-030, FR-031 |
| NFR-001 (only modify lib.rs lines 119–129, 246–248) | NFR-001, NFR-002 |
| NFR-002 (do not touch lines 183–191) | NFR-003 |
| NFR-003 (preserve .visible(false)) | NFR-010 |
| NFR-004 (extractable, unit-testable helpers) | NFR-020, NFR-021 |

## Open Questions

None blocking.
