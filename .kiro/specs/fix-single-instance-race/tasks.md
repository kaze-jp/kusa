# Implementation Tasks: fix-single-instance-race

## Document Info
- Feature: fix-single-instance-race
- Total tasks: 7
- Parallelizable: 1 (T-001 standalone — pure helper)
- Created: 2026-05-27

## Task Dependency Graph

```
T-001 (PendingEventBuffer + drain helper)
  │
  ├──▶ T-002 (manage state + .manage call in lib.rs)
  │      │
  │      └──▶ T-003 (single-instance callback rewrite)
  │             │
  │             └──▶ T-005 (invoke_handler entry + add module re-exports)
  │
  └──▶ T-004 (flush_pending_events command + unit tests in commands.rs)
         │
         └──▶ T-005 (invoke_handler entry)

T-006 (resolve_and_emit logging) — depends on T-002 only because both
                                   edit lib.rs; can be parallel with T-003
                                   if regions don't overlap (they don't,
                                   but for simplicity we sequence after T-005).

T-007 (frontend invoke + verification) — depends on T-005 (backend complete)
```

## Parallel Execution Groups

Group A (foundation): T-001
Group B (after T-001): T-002, T-004 cannot fully parallelize because
both add code to `lib.rs` test imports / signatures. Run sequentially.
Group C (after T-005): T-006, T-007 are in different files (lib.rs vs App.tsx);
T-007 can start once T-005 lands. T-006 is small Rust-only.

Given the tight coupling, **we recommend serial execution** (T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007). The AO can still parallelize unit testing within tasks but tasks themselves are mostly sequential.

## Tasks

### T-001: Add `PendingEventBuffer` struct + `drain_pending_events` helper

- **Description**:
  - Define `pub struct PendingEventBuffer(pub Mutex<Vec<(String, String)>>);` with `#[derive(Default)]` in `src-tauri/src/lib.rs` (near other state structs at top of file).
  - Define `pub(crate) fn drain_pending_events<F: FnMut(&str, String)>(buffer: &PendingEventBuffer, mut emit_fn: F)` in `src-tauri/src/lib.rs` — pure helper that locks the mutex, drains the buffer, and calls `emit_fn` for each entry. On poisoned mutex: skip silently.
- **Files**: `src-tauri/src/lib.rs`
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] `PendingEventBuffer` compiles and implements `Default + Send + Sync`.
  - [ ] `drain_pending_events` is `pub(crate)` so commands.rs can call it.
  - [ ] No existing code is changed except adding the new struct + helper near top of file.
  - [ ] `cargo build` succeeds warning-free.
- **Tests**: Covered by T-004 (which imports and tests the helper).
- **Effort**: Small

### T-002: Register `PendingEventBuffer` state in `tauri::Builder`

- **Description**:
  - Insert `.manage(PendingEventBuffer::default())` in the builder chain in `run()` alongside the other `.manage(...)` calls (around line 163-165). Do **not** touch lines 119-129 or 246.
- **Files**: `src-tauri/src/lib.rs`
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] `.manage(PendingEventBuffer::default())` is present in the builder chain.
  - [ ] Builder chain still compiles.
- **Tests**: Compile-time check via `cargo build`.
- **Effort**: Small

### T-003: Rewrite single-instance callback to buffer when window absent

- **Description**:
  - Modify `tauri_plugin_single_instance::init(...)` callback at lib.rs:183-191 per design.md:
    - If `app.get_webview_window("main").is_some()` → call `resolve_and_emit(app, path)` (current).
    - Else if `app.try_state::<PendingEventBuffer>()` is `Some` → lock mutex, push `("cli-open".to_string(), path.clone())`.
    - Always attempt `set_focus()` when window exists (preserved).
- **Files**: `src-tauri/src/lib.rs`
- **Dependencies**: T-002
- **Acceptance Criteria**:
  - [ ] Callback handles both window-exists and window-absent cases.
  - [ ] Uses `try_state` not `state` (no panic on missing state).
  - [ ] Does not panic on poisoned mutex (`if let Ok(...)` guard).
  - [ ] `cargo build` succeeds warning-free.
- **Tests**: Code review + manual smoke test in T-007.
- **Effort**: Small

### T-004: Add `flush_pending_events` command + unit tests

- **Description**:
  - Add `#[tauri::command] pub fn flush_pending_events(app: tauri::AppHandle)` in `src-tauri/src/commands.rs`. Implementation per design.md: get state via `app.state::<crate::PendingEventBuffer>()`, call `crate::drain_pending_events(&state, |event, payload| { ... eprintln on err ... });`.
  - Add unit tests in `src-tauri/src/commands.rs#tests` for `crate::drain_pending_events`:
    1. `test_drain_pending_events_empty_buffer_is_noop`
    2. `test_drain_pending_events_drains_in_fifo_order`
    3. `test_drain_pending_events_drains_to_empty`
    4. `test_drain_pending_events_poisoned_mutex_is_noop`
- **Files**: `src-tauri/src/commands.rs`
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] Command compiles and is annotated `#[tauri::command]`.
  - [ ] All four unit tests pass (`cargo test`).
  - [ ] Poisoned-mutex test does not crash test runner.
- **Tests**: 4 new unit tests as above.
- **Effort**: Medium

### T-005: Register `flush_pending_events` in `invoke_handler`

- **Description**:
  - Add `commands::flush_pending_events` to the `tauri::generate_handler![...]` list at lib.rs:166-181. Position at end of the list (alphabetical or last) — anywhere outside lines 119-129 and 246.
- **Files**: `src-tauri/src/lib.rs`
- **Dependencies**: T-003, T-004
- **Acceptance Criteria**:
  - [ ] `commands::flush_pending_events` appears in the macro invocation.
  - [ ] `cargo build --release` succeeds warning-free.
- **Tests**: Compile-time check.
- **Effort**: Small

### T-006: Log emit failures in `resolve_and_emit`

- **Description**:
  - At lib.rs:134-149, replace each `let _ = emitter.emit(...)` call with `if let Err(e) = emitter.emit(...) { eprintln!("Failed to emit <event_name> event: {}", e); }`. Apply to all three sites: raw fallback (`cli-open`), dir branch (`cli-open-dir`), file branch (`cli-open`).
- **Files**: `src-tauri/src/lib.rs`
- **Dependencies**: T-005 (sequential ordering only — disjoint region)
- **Acceptance Criteria**:
  - [ ] All three emit sites now log on `Err`.
  - [ ] `cargo build` succeeds warning-free.
  - [ ] Existing tests (if any reference this path) still pass.
- **Tests**: Manual code review.
- **Effort**: Small

### T-007: Frontend — invoke `flush_pending_events` after listener registration

- **Description**:
  - In `src/App.tsx` `setupTauriListeners` (~line 224-272), after the three `listen(...)` calls complete (right before `onCleanup(...)`), add:
    ```ts
    await invoke("flush_pending_events").catch(() => {});
    ```
- **Files**: `src/App.tsx`
- **Dependencies**: T-005 (backend command must exist)
- **Acceptance Criteria**:
  - [ ] Invoke happens after all three listeners are registered.
  - [ ] `.catch(() => {})` is present (silent failure).
  - [ ] TypeScript type-check passes (`bun run typecheck` or `tsc --noEmit`).
  - [ ] No regression in `kusa file.md` (1st-instance) flow — manual smoke.
- **Tests**: Manual smoke test:
  - 1st instance: `kusa README.md` opens README.
  - 2nd instance race: open kusa with one file, immediately open with another → 2nd file shows.
- **Effort**: Small

## File Conflict Matrix

| Task | Files | Conflicts With |
|------|-------|----------------|
| T-001 | `src-tauri/src/lib.rs` (top: new struct+helper) | T-002, T-003, T-005, T-006 (same file) |
| T-002 | `src-tauri/src/lib.rs` (builder chain ~163-165) | T-001, T-003, T-005, T-006 |
| T-003 | `src-tauri/src/lib.rs` (callback 183-191) | T-001, T-002, T-005, T-006 |
| T-004 | `src-tauri/src/commands.rs` | None |
| T-005 | `src-tauri/src/lib.rs` (invoke_handler 166-181) | T-001, T-002, T-003, T-006 |
| T-006 | `src-tauri/src/lib.rs` (134-149) | T-001, T-002, T-003, T-005 |
| T-007 | `src/App.tsx` | None |

## Constraint Compliance

- All `lib.rs` edits land in the disjoint regions: top-of-file (struct), 134-149 (resolve_and_emit), 160-165 (.manage), 166-181 (invoke_handler), 183-191 (callback). **Lines 119-129 and 246 are untouched** (#69's region).
- TDD: T-004 unit tests are written alongside / before the command implementation; the helper (T-001) is testable purely.
- No `git commit --no-verify`.

## Requirements Traceability

| Requirement | Tasks |
|-------------|-------|
| FR-001 (PendingEventBuffer struct) | T-001 |
| FR-002 (.manage) | T-002 |
| FR-003 (command exposed) | T-004, T-005 |
| FR-004 (drain in FIFO) | T-001, T-004 |
| FR-005 (no panic poisoned mutex) | T-001 |
| FR-010 (emit when window exists) | T-003 |
| FR-011 (buffer when window absent) | T-003 |
| FR-012 (set_focus preserved) | T-003 |
| FR-013 (no panic missing state) | T-003 (try_state) |
| FR-020 (log emit failures) | T-006 |
| FR-030 (frontend invoke) | T-007 |
| FR-031 (.catch) | T-007 |
| FR-040 (no args → skip) | T-003 (existing guard preserved) |
| FR-041 (multi-entry flush) | T-001, T-004 (test) |
| FR-042 (empty flush no-op) | T-001, T-004 (test) |
| FR-050 (continue on partial emit fail) | T-004 |
| NFR-001/002 (perf) | T-001, T-002 |
| NFR-010/011 (Mutex + no panic) | T-001, T-003, T-004 |
| NFR-012 (no duplicate 1st-instance) | T-003 (callback-only push) |
| NFR-020 (new unit tests) | T-004 |
| NFR-021 (existing tests pass) | All tasks (validated at T-007) |
| NFR-030 (warning-free) | All tasks (validated at T-007) |
| NFR-031 (frontend type-check) | T-007 |
| C-001 (avoid #69 regions) | All tasks (constraint compliance section) |
| C-002 (no --no-verify) | Workflow contract |
| C-003 (preserve resolve_and_emit signature) | T-006 |
| C-004 (no auto-flush) | T-004 (drain only on invoke) |
