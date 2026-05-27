# Feature: fix-create-window-error

## Overview

kusa の起動時に `create_window` が失敗した場合に、`setup()` が `Ok(())` を返してしまい、ウィンドウなしのプロセスがゾンビ状態で残る現象を防ぐバグ修正。Full mode にも safe-defaults による fallback を追加し、最終的な失敗時には Err を返して Tauri に明示的な panic を起こさせる。

## Product Context

- kusa は Markdown エディター/ビューワー (Tauri v2 + SolidJS)
- CLI/Finder/drag-drop/URL scheme など複数の起動経路を持つ
- 起動失敗時は **無音で残る** より **明示的に落ちる** ほうがユーザーに状況が伝わる

(注: `.ao/steering/product.md` はテンプレートのままで具体的なプロダクト情報を含んでいないため、ここでは CLAUDE.md と issue 本文を一次情報源として使用する。)

## Initial Requirements

### Functional Requirements

- **FR-001**: When `create_window` returns `Err` inside `setup()`, the system shall propagate the error and return it from `setup()` (which causes Tauri to panic at startup, surfacing the failure to the user).
- **FR-002**: When the Full mode window builder (`WebviewWindowBuilder::new(...).build()`) returns `Err`, the system shall retry with a safe-defaults builder (minimum required configuration, no plugin-restored state) before giving up.
- **FR-003**: If the safe-defaults fallback also fails, the system shall return the error from `create_window` (which is then propagated by FR-001).
- **FR-004**: When the safe-defaults fallback is invoked, the system shall log the original failure reason via `eprintln!` so the user can diagnose the cause.
- **FR-005**: When `window.show()` returns `Err` after a successful build, the system shall log the failure via `eprintln!` (not silently ignore it via `.ok()`). The build success is sufficient for `create_window` to return `Ok(())` because the frontend later explicitly calls show.
- **FR-006**: The existing Peek mode → Full mode fallback (lib.rs lines 93–117) shall continue to function unchanged.

### Non-Functional Requirements

- **NFR-001**: The fix shall modify only `src-tauri/src/lib.rs`, restricted to lines 119–129 (Full mode builder) and lines 246–248 (setup-level `create_window` call).
- **NFR-002**: The fix shall not touch lines 183–191 (single-instance plugin) which is owned by sibling issue #70.
- **NFR-003**: The system shall not change `.visible(false)` semantics; visibility is still managed by frontend explicit show.
- **NFR-004**: Where reasonable, extractable helpers (e.g., `build_full_window_with_fallback`) shall be unit-testable in Rust without launching a real Tauri runtime.

### Constraints

- Returning `Err` from `setup()` causes Tauri to panic — this is **intended** behaviour. The user should see a clear failure rather than a silent zombie process.
- The safe-defaults fallback for Full mode must use a configuration that does **not** depend on potentially corrupted state from `tauri_plugin_window_state` (e.g., explicit `inner_size`, `decorations(true)`, `title("kusa")`).
- `.visible(false)` is preserved in both primary build and fallback build — the frontend calls `show()` explicitly later.
- `git commit --no-verify` is forbidden.
- Only the listed line ranges in `src-tauri/src/lib.rs` may be modified.

### Assumptions

- The Tauri panic message is acceptable as the user-facing surface for catastrophic window-creation failures (no separate user dialog is required).
- The optional `--reset-window` flag (issue #69 item 3) is **out of scope** and will be a future issue.
- A safe-defaults `WebviewWindowBuilder` with `title("kusa")`, `inner_size(FULL_SIZE.width, FULL_SIZE.height)`, `decorations(true)`, `visible(false)` is sufficient to bypass plugin-restored state in practice.
- Rust unit tests can exercise pure logic but cannot drive the Tauri runtime; thus tests focus on extractable helpers (constants, configuration shape) rather than end-to-end window creation.

### Open Questions

- None blocking. The fix is well-scoped by the issue body and pre-canned answers.
