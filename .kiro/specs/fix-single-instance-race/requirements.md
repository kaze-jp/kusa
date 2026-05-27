# Requirements: fix-single-instance-race

## Document Info
- Feature: fix-single-instance-race
- Status: Draft
- Created: 2026-05-27
- Related issue: #70
- Sibling (parallel) work: #69 (modifies disjoint regions of `src-tauri/src/lib.rs`)

## Background

`tauri_plugin_single_instance` の callback は OS 由来の IPC により発火するため、`tauri::Builder::setup()` が完了する前 (= main webview window が生成される前) にも実行されうる。現状の実装はこのケースで:
1. `resolve_and_emit` がイベントを emit するが、frontend listener が未登録のため event が捨てられる。
2. `app.get_webview_window("main")` が `None` のため `set_focus()` も発生しない。

結果として、2nd instance のファイル open が反映されず、window も前面化しない。本仕様は本 race condition を pending-event buffer 方式で解消する。

## Functional Requirements

### Core Behavior

- **FR-001**: The system **shall** expose a process-global mutable state struct named `PendingEventBuffer` containing a `Mutex<Vec<(String, String)>>` representing buffered `(event_name, payload)` pairs.
- **FR-002**: The system **shall** register `PendingEventBuffer::default()` via `tauri::Builder::manage(...)` so it is available through `app.state::<PendingEventBuffer>()`.
- **FR-003**: The system **shall** expose a new Tauri command `flush_pending_events(app: tauri::AppHandle)` registered in `invoke_handler`.
- **FR-004**: When `flush_pending_events` is invoked, the system **shall** acquire the `PendingEventBuffer` mutex, drain all entries, and call `app.emit(&event, payload)` for each entry, in FIFO order.
- **FR-005**: When `flush_pending_events` is invoked and the mutex is poisoned, the system **shall** not panic; it shall fail gracefully (e.g. by returning without emitting).

### single-instance callback path

- **FR-010**: When the single-instance callback is invoked with a non-empty `args[1]` and the main webview window already exists, the system **shall** call `resolve_and_emit(app, args[1])` (current happy-path behaviour preserved).
- **FR-011**: When the single-instance callback is invoked with a non-empty `args[1]` and the main webview window does **not** yet exist, the system **shall** push `("cli-open", args[1].clone())` to the `PendingEventBuffer`.
  - Note: We intentionally push the raw CLI argument unresolved (matching the existing `resolve_and_emit` fallback for non-canonicalizable paths). Frontend already handles raw path resolution downstream via existing logic.
- **FR-012**: When the main webview window exists at the time of single-instance callback invocation, the system **shall** call `window.set_focus()` (current behaviour preserved).
- **FR-013**: If `app.state::<PendingEventBuffer>()` cannot be obtained or the mutex lock fails inside the single-instance callback, the system **shall** silently skip buffering (best-effort, must not panic).

### resolve_and_emit logging

- **FR-020**: When `resolve_and_emit` calls `emitter.emit("cli-open", ...)` or `emitter.emit("cli-open-dir", ...)` and the result is `Err(e)`, the system **shall** log `Failed to emit <event_name> event: <e>` to stderr via `eprintln!`.

### Frontend integration

- **FR-030**: After the frontend's `setupTauriListeners` (in `src/App.tsx`) finishes registering all Tauri event listeners (cli-open, cli-open-dir, etc.), the frontend **shall** invoke the Tauri command `flush_pending_events`.
- **FR-031**: If the invoke of `flush_pending_events` rejects, the frontend **shall** suppress the error (`.catch(() => {})`) so listener setup is not interrupted.

### Edge Cases

- **FR-040**: Where the single-instance callback receives no `args[1]` (user ran `kusa` with no path argument), the system **shall not** buffer anything and **shall not** emit `cli-open`/`cli-open-dir`.
- **FR-041**: Where the buffer contains multiple entries (e.g. user triggered 3 rapid 2nd-instance calls before window readiness), the system **shall** flush all of them on a single `flush_pending_events` invocation.
- **FR-042**: Where `flush_pending_events` is invoked but the buffer is empty, the system **shall** return without performing any emit calls.

### Error Handling

- **FR-050**: If `emit` inside `flush_pending_events` returns `Err`, the system **shall** continue draining and emitting the remaining buffered entries (one failure must not block others).

## Non-Functional Requirements

### Performance

- **NFR-001**: The system **shall** add no measurable cold-start regression: `PendingEventBuffer::default()` allocation and `.manage(...)` registration are O(1) constant cost.
- **NFR-002**: The system **shall** hold the `PendingEventBuffer` mutex only for the minimum duration required (push for buffering, drain for flush). No I/O occurs while the lock is held except for the emit calls in flush (which are non-blocking message sends).

### Reliability / Safety

- **NFR-010**: The system **shall** protect the buffer with `std::sync::Mutex` (already required by `Send + Sync` for Tauri managed state).
- **NFR-011**: The system **shall not** panic on poisoned mutex; both single-instance callback (FR-013) and `flush_pending_events` (FR-005) use `if let Ok(...)` style guards.
- **NFR-012**: The fix **shall not** introduce duplicate event emission for the 1st instance: the 1st instance receives its initial file path via `get_cli_args` (existing), and the buffer is only populated by the single-instance callback path which only fires for 2nd+ instances.

### Testability

- **NFR-020**: The new command `flush_pending_events` **shall** have a Rust unit test (`#[cfg(test)] mod tests`) verifying:
  - Empty buffer → no emit, no panic.
  - Buffer with N entries → buffer is drained to empty after flush.
  - Function does not panic on poisoned mutex (best-effort).
- **NFR-021**: All existing tests under `src-tauri/` **shall** continue to pass (`cargo test`).

### Code quality

- **NFR-030**: New Rust code **shall** compile warning-free (`cargo build --release`).
- **NFR-031**: Frontend changes in `App.tsx` **shall** pass type-check (`tsc --noEmit` or equivalent).

## Constraints

- **C-001**: The implementation **shall not** modify `src-tauri/src/lib.rs` lines 119-129 (Full mode window builder) nor line 246 (`create_window` invocation inside `.setup()`). These regions are owned by sibling issue #69.
- **C-002**: The implementation **shall not** use `git commit --no-verify`.
- **C-003**: The implementation **shall** preserve existing `resolve_and_emit` signature and call-sites (no duplicate registrations).
- **C-004**: Auto-flush from backend (e.g. on `setup()` completion) is **out of scope**; frontend owns the responsibility of calling `flush_pending_events`.

## Acceptance Criteria

1. **2nd-instance race fix**: Running `kusa a.md`, then within ~100 ms running `kusa b.md`, results in `b.md` being shown in the 1st-instance window (manually verified or simulated via test scenario).
2. **No 1st-instance regression**: Running `kusa file.md` from a clean state opens `file.md` correctly (no duplicate emit, no error log).
3. **Sibling-issue compatibility**: A 3-way merge with #69 succeeds without conflict in the specified line regions.
4. **Test pass**: `cargo test` passes including new unit test for `flush_pending_events`.
5. **Lint/build clean**: `cargo build --release` succeeds warning-free.
6. **CodeRabbit review**: No critical or major findings.

## Traceability

| requirements-init item | Expanded FR/NFR |
|---|---|
| FR-001 (open in existing instance) | FR-010, FR-011, FR-030 (frontend flush) |
| FR-002 (buffer when window absent) | FR-001, FR-002, FR-011 |
| FR-003 (preserve emit when window present) | FR-010 |
| FR-004 (frontend invoke after listeners) | FR-030, FR-031 |
| FR-005 (drain and emit on flush) | FR-003, FR-004 |
| FR-006 (log emit failures) | FR-020 |
| FR-007 (preserve set_focus) | FR-012 |
| NFR-001 (Mutex protection) | NFR-010, NFR-011 |
| NFR-002 (no cold-start regression) | NFR-001, NFR-002 |
| NFR-003 (no duplicate events) | NFR-012 |
| NFR-004 (tests pass) | NFR-020, NFR-021 |
| NFR-005 (frontend catch) | FR-031 |
| C-001..C-005 | C-001..C-004 |

## Open Questions

None at this time. Issue body provides a concrete suggested fix that this requirements document fully captures.
