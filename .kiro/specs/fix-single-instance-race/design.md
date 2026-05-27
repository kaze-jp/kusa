# Technical Design: fix-single-instance-race

## Document Info
- Feature: fix-single-instance-race
- Status: Draft
- Created: 2026-05-27
- Requirements: ./requirements.md
- Related: GitHub issue #70; sibling parallel issue #69 (touches same file, disjoint lines)

## Architecture Overview

We introduce a process-global, mutex-protected buffer (`PendingEventBuffer`) and a new Tauri command (`flush_pending_events`) that the frontend invokes once event listeners are wired. The single-instance plugin callback writes to the buffer when the main window does not yet exist, and emits directly otherwise.

```
                              kusa process (1st instance)
                              ───────────────────────────────
2nd instance ──IPC──▶  [single-instance callback]
                            │
                            ├─ window exists?  ──yes──▶ resolve_and_emit ─emit─▶ frontend listener
                            │
                            └─ no  ──▶ PendingEventBuffer.push((event, payload))
                                              ▲
                                              │ drain
                                              │
[setup() completes] ─▶ webview created ─▶ frontend mount ─▶ setupTauriListeners()
                                                                   │
                                                                   └─▶ invoke("flush_pending_events")
                                                                              │
                                                                              └─▶ app.emit(event, payload) × N
                                                                                          │
                                                                                          ▼
                                                                                  frontend listener
```

## Component Design

### Component: `PendingEventBuffer` (state)

- **Purpose**: Holds `(event_name, payload)` pairs that need to be delivered to the frontend once it is ready.
- **Location**: `src-tauri/src/lib.rs` (top-level)
- **Dependencies**: `std::sync::Mutex`
- **Interface**:
  ```rust
  #[derive(Default)]
  pub struct PendingEventBuffer(pub Mutex<Vec<(String, String)>>);
  ```
- **Registered via**: `tauri::Builder::manage(PendingEventBuffer::default())` (placed alongside other `.manage(...)` calls at lines ~160-165, well outside #69's regions).

### Component: `flush_pending_events` (Tauri command)

- **Purpose**: Drain the buffer and re-emit each entry. Invoked once by the frontend after listeners are registered.
- **Location**: `src-tauri/src/commands.rs`
- **Dependencies**: `tauri::AppHandle`, `tauri::{Emitter, Manager}`, `crate::PendingEventBuffer`
- **Interface**:
  ```rust
  #[tauri::command]
  pub fn flush_pending_events(app: tauri::AppHandle);
  ```
- **Registered via**: `invoke_handler` block at lines 166-181 (also outside #69's regions). Order in the handler list does not matter functionally; alphabetical/grouped is fine.

#### Testability helper

To keep unit tests independent of `tauri::AppHandle` (which is non-trivial to mock without `tauri::test`), we extract the drain logic into a pure function:

```rust
pub(crate) fn drain_pending_events<F: FnMut(&str, String)>(
    buffer: &crate::PendingEventBuffer,
    mut emit_fn: F,
) {
    if let Ok(mut buf) = buffer.0.lock() {
        for (event, payload) in buf.drain(..) {
            emit_fn(&event, payload);
        }
    }
    // Poisoned mutex: skip silently (NFR-011 / FR-005)
}
```

Then `flush_pending_events` becomes a one-line wrapper:

```rust
#[tauri::command]
pub fn flush_pending_events(app: tauri::AppHandle) {
    use tauri::{Emitter, Manager};
    let state = app.state::<crate::PendingEventBuffer>();
    drain_pending_events(&state, |event, payload| {
        if let Err(e) = app.emit(event, payload) {
            eprintln!("Failed to emit {} from flush: {}", event, e);
        }
    });
}
```

This separation lets us unit-test `drain_pending_events` directly (FR-003, FR-004, FR-005, FR-041, FR-042, FR-050) without needing a Tauri runtime.

### Component: single-instance plugin callback (modified)

- **Location**: `src-tauri/src/lib.rs:183-191`
- **Change**: Branch on `app.get_webview_window("main").is_some()`. On `None`, push to buffer instead of emit. Use `app.try_state::<PendingEventBuffer>()` to avoid panicking if state is somehow not yet registered (defensive).
- **Pseudocode** (from issue body, lightly hardened):
  ```rust
  .plugin(
      tauri_plugin_single_instance::init(|app, args, _cwd| {
          if let Some(path) = args.get(1) {
              if app.get_webview_window("main").is_some() {
                  resolve_and_emit(app, path);
              } else if let Some(state) = app.try_state::<PendingEventBuffer>() {
                  if let Ok(mut buf) = state.0.lock() {
                      buf.push(("cli-open".to_string(), path.clone()));
                  }
              }
          }
          if let Some(window) = app.get_webview_window("main") {
              let _ = window.set_focus();
          }
      }),
  )
  ```

#### Known limitation — directory args in race window

The buffered branch always uses `"cli-open"` as the event name (per issue body). If a user runs `kusa some-dir/` in the race window (before the main window is created), the frontend will receive `cli-open` and try to open the directory as a file, failing with an error.

**Decision**: Accept this limitation. Rationale:
1. The issue body and Suggested Fix explicitly prescribe this behaviour.
2. The race window is ~hundreds of ms; the dominant case is opening files, not directories.
3. Doing `canonicalize`/`is_dir()` in the callback adds I/O on the IPC thread (small but unbounded latency).
4. Frontend error handling for "file not found" is already graceful (toast / silent skip).

If needed later, a follow-up can call `resolve_and_emit`'s I/O logic from the callback. Noted as a follow-up below.

### Component: `resolve_and_emit` (modified)

- **Location**: `src-tauri/src/lib.rs:134-149`
- **Change**: Log emit failures via `eprintln!` instead of silently `let _ =`.
- **Diff**:
  ```rust
  if let Err(e) = emitter.emit("cli-open", canonical.to_string_lossy().to_string()) {
      eprintln!("Failed to emit cli-open event: {}", e);
  }
  ```
- Apply the same pattern to all three emit sites inside `resolve_and_emit` (raw fallback, dir, file).

### Component: Frontend `setupTauriListeners` (modified)

- **Location**: `src/App.tsx` (function around line 224)
- **Change**: After all three `listen()` calls resolve and before `onCleanup(...)`, invoke `flush_pending_events`:
  ```ts
  await invoke("flush_pending_events").catch(() => {});
  ```
- **Order matters** (FR-030): the invoke must come **after** all three listeners are registered, so any buffered events are delivered into live listeners, not dropped.

## API Contracts

### `flush_pending_events`

- **Signature**: `flush_pending_events(app: tauri::AppHandle) -> ()`
- **Input**: none (besides the implicit `AppHandle` injected by Tauri)
- **Output**: `()` — fire-and-forget. The frontend does not need to await the emit results.
- **Errors**:
  - Mutex poisoned → skip silently (no return value)
  - `app.emit(...)` returns `Err` → log via `eprintln!`, continue draining (FR-050)
- **Frontend usage**:
  ```ts
  await invoke("flush_pending_events").catch(() => {});
  ```

### Single-instance callback

- **Signature**: `Fn(&AppHandle, Vec<String>, String)` — unchanged from `tauri_plugin_single_instance` 0.x
- **Side effects**:
  - If window exists: emit + focus (current behaviour)
  - If window absent: push to buffer; focus skipped (no window to focus yet — the cold window will mount and frontend will replay the buffered event)

## Data Models

### `PendingEventBuffer`

- **Fields**:
  - `0: Mutex<Vec<(String, String)>>` — `(event_name, payload)` queue, FIFO
- **Validation**: none; both strings are arbitrary
- **Relationships**: registered as Tauri managed state; reachable from any handler / plugin callback via `app.state::<PendingEventBuffer>()` or `app.try_state::<PendingEventBuffer>()`
- **Lifetime**: process-global, lives for the lifetime of the `AppHandle`

## State Management

```
┌────────────────────────────────────────────────────────────────────┐
│ tauri::Builder                                                     │
│   .manage(PendingEventBuffer::default())   ← created at startup    │
│   .plugin(single_instance::init(...))      ← reads/writes buffer   │
│   .invoke_handler!(flush_pending_events)   ← drains buffer         │
└────────────────────────────────────────────────────────────────────┘

  single-instance callback ──push──▶ Mutex<Vec<(String, String)>>
                                                │
        frontend ─invoke─▶ flush_pending_events ┘ ──emit each──▶ frontend listener
```

Lock is acquired briefly:
- `push`: O(1) inside lock
- `drain`: lock held during drain + emit calls; emit is non-blocking (queues message into webview)

## Error Handling Strategy

| Failure | Strategy | Rationale |
|---|---|---|
| Mutex poisoned (single-instance callback) | Skip buffering; no panic | UX: silently fail a single keystroke rather than crash the whole app |
| Mutex poisoned (flush) | Skip; no panic | Same |
| `try_state` returns `None` in callback | Skip buffering | Defensive — `manage()` is called before `plugin()`, so this is a "should never happen" but we don't panic |
| `app.emit(...)` returns `Err` (resolve_and_emit) | `eprintln!` + continue | Diagnostic for issue #70 follow-ups (FR-020) |
| `app.emit(...)` returns `Err` (flush) | `eprintln!` + continue draining (FR-050) | Don't block remaining buffered entries |
| Frontend `invoke("flush_pending_events")` rejects | `.catch(() => {})` | listener setup must not fail; flush is best-effort (FR-031) |

## Testing Strategy

### Unit tests (new) — `src-tauri/src/commands.rs#tests`

Test target: `drain_pending_events` (the pure helper exposed as `pub(crate)` from `lib.rs`).

1. **`test_flush_pending_events_empty_buffer_is_noop`** — empty buffer; closure must not be called.
2. **`test_flush_pending_events_drains_in_fifo_order`** — push 3 entries; verify closure called 3× with correct payloads in order; buffer empty after.
3. **`test_flush_pending_events_drains_to_empty_on_partial_emit_failure`** — closure simulates partial failure (e.g. always succeeds since signature is `FnMut(&str, String)` with no error path on the helper); we still verify the buffer is fully drained.
4. **`test_flush_pending_events_poisoned_mutex_is_noop`** — induce poisoning by panicking inside the lock guard from another thread; verify drain function does not panic.

### Integration tests
Manual smoke test post-build (out of unit-test scope):
- 1st-instance `kusa README.md` opens correctly.
- `kusa a.md` + `kusa b.md` within ~100 ms → `b.md` is shown.

### Edge cases to cover
- FR-040: callback with no `args[1]` — verified by code review (early return).
- FR-041: multiple buffered entries — covered by test #2 above.
- FR-042: empty buffer flush — covered by test #1.
- FR-050: emit failure (best-effort) — `eprintln` path is straightforward; tested via review.

## Security Considerations

- The buffer holds CLI argument strings. These are already trusted (user typed them on their own terminal). No new attack surface.
- Mutex prevents data races (memory-safety property; not security per se).
- No new IPC surface beyond the new command (which is a no-args drain).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `app.state::<PendingEventBuffer>()` panics if state not managed | Use `try_state` in single-instance callback (defensive); rely on `.manage()` ordering otherwise |
| Buffer never drained (frontend bug) | Best-effort: stale entries are harmless (no leak, just untriggered listeners). If listener never wires up, the issue is broader than this fix |
| Sibling #69 merge conflict | #70 touches lines 134-149 + 160-165 (.manage insertion) + 166-181 (invoke_handler addition) + 183-191. #69 touches 119-129 and ~246. Disjoint. |
| `RunEvent::Opened` path (lines 324-333) has same race | Out of scope for this fix (per issue body). Noted as follow-up. |

## Follow-ups (not in scope)

- **F-1**: Apply same buffer-or-emit pattern to `RunEvent::Opened` handler (currently calls `resolve_and_emit` directly).
- **F-2**: Use `canonicalize`/`is_dir()` in the single-instance callback so directory args take `cli-open-dir` even in the race window.

## Requirements Traceability

| Requirement | Component / Site |
|---|---|
| FR-001 (PendingEventBuffer struct) | `PendingEventBuffer` in lib.rs |
| FR-002 (`.manage(...)`) | `tauri::Builder` chain in lib.rs |
| FR-003 (command exposed) | `flush_pending_events` in commands.rs + `invoke_handler` |
| FR-004 (drain + emit FIFO) | `drain_pending_events` helper |
| FR-005 (no panic on poisoned mutex) | `if let Ok(...)` guard in `drain_pending_events` |
| FR-010 (window exists → emit) | single-instance callback `if` branch |
| FR-011 (window absent → buffer) | single-instance callback `else if` branch |
| FR-012 (set_focus on window) | single-instance callback (preserved) |
| FR-013 (no panic on missing state) | `try_state` use |
| FR-020 (log emit failures) | `resolve_and_emit` updated logging |
| FR-030 (frontend invoke after listeners) | `setupTauriListeners` (App.tsx) |
| FR-031 (.catch(() => {})) | `setupTauriListeners` |
| FR-040 (no args → skip) | `if let Some(path) = args.get(1)` guard (existing) |
| FR-041 (multi-entry flush) | `drain(..)` + test #2 |
| FR-042 (empty flush no-op) | `drain` early loop exit + test #1 |
| FR-050 (continue on emit failure) | `eprintln + continue` in flush closure |
| NFR-001/002 (perf) | O(1) state setup, brief locks |
| NFR-010/011 (Mutex + no panic) | `if let Ok(...)` guards |
| NFR-012 (no duplicate 1st-instance events) | Buffer only written from single-instance callback path (2nd+ instances) |
| NFR-020/021 (tests) | New unit tests in commands.rs#tests |
| NFR-030 (warning-free) | Code review + `cargo build --release` |
| NFR-031 (frontend type-check) | tsc — `invoke` and `.catch(() => {})` are both typed |
| C-001 (avoid #69 regions) | All edits confined to 134-149, 160-165, 166-181, 183-191 |
| C-002 (no --no-verify) | Workflow contract |
| C-003 (preserve resolve_and_emit signature) | Only logging added, signature unchanged |
| C-004 (no auto-flush) | Backend only flushes on explicit invoke |
