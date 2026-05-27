# Implementation Tasks: fix-cli-relaunch-spawn

## Document Info

- Feature: fix-cli-relaunch-spawn
- Total tasks: 6
- Parallelizable: 0 (all touch the same single file — strictly sequential)
- Created: 2026-05-27
- Auto-approved via `-y`
- Linked Issue: #68
- Requirements: ./requirements.md
- Design: ./design.md

## Scope Note

All tasks modify the same file (`src-tauri/src/main.rs`). True file-level parallelism is therefore not possible. The tasks are sequenced so that each step is independently verifiable: a pure helper first (with tests), then call-site changes, then end-to-end build verification.

## Task Dependency Graph

```text
T-001 (helper + tests)
   │
   ▼
T-002 (use rfind via helper at call site)
   │
   ▼
T-003 (canonicalize + bundle validation)
   │
   ▼
T-004 (spawn match + fallback)
   │
   ▼
T-005 (block-comment refresh)
   │
   ▼
T-006 (build / clippy / test verification)
```

## Parallel Execution Groups

None. All tasks are sequential (single-file feature).

## Tasks

### T-001: Add `extract_app_path` pure helper with unit tests

- **Description**: Implement a pure free function `fn extract_app_path(exe_str: &str) -> Option<&str>` in `src-tauri/src/main.rs`. The function uses `exe_str.rfind(".app/")` and returns `Some(&exe_str[..idx + 4])` if found, else `None`. Add a `#[cfg(test)] mod tests` block in the same file with the 6 test cases enumerated in design.md Testing Strategy.
- **Files**:
  - Modify: `src-tauri/src/main.rs`
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] `extract_app_path` exists as a free function with the exact signature `fn extract_app_path(exe_str: &str) -> Option<&str>`.
  - [ ] The function is compiled unconditionally (no `#[cfg]` gate) so it is testable on all platforms.
  - [ ] All 6 unit tests pass: `extract_app_path_single_bundle`, `extract_app_path_nested_bundles`, `extract_app_path_no_bundle`, `extract_app_path_trailing_slash`, `extract_app_path_empty_string`, `extract_app_path_app_in_middle_only`.
  - [ ] `cargo test -p kusa` passes locally (in the `src-tauri` workspace).
- **Tests**: The 6 cases listed in design.md §Testing Strategy.
- **Effort**: Small

### T-002: Replace `exe_str.find(".app/")` with the helper at the call site

- **Description**: In the relaunch block inside `main()` (currently around line 41), replace `if let Some(app_idx) = exe_str.find(".app/")` and the manual slice with a call to `extract_app_path(&exe_str)`. The control flow remains identical: `Some(candidate)` enters the relaunch attempt, `None` falls through to `kusa_lib::run()`.
- **Files**:
  - Modify: `src-tauri/src/main.rs`
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] `exe_str.find(".app/")` no longer appears in the file.
  - [ ] `extract_app_path(&exe_str)` is the new source of `candidate`.
  - [ ] Nested-bundle case yields the inner `.app` path (verified via T-001 tests).
  - [ ] Existing `args` / `user_args` / `resolved_args` logic unchanged.
- **Tests**: Covered by T-001.
- **Effort**: Small

### T-003: Validate `app_path` via canonicalize + is_dir + extension check

- **Description**: After extracting `candidate`, call `std::fs::canonicalize(candidate)`. If it returns `Err`, print the FR-012 canonicalize-failure message to stderr and fall through to `kusa_lib::run()`. Otherwise check `canonical.is_dir() && canonical.extension().and_then(|s| s.to_str()) == Some("app")`; if either fails, print the FR-012 invalid-bundle message and fall through. Pass `&canonical` (not the raw `candidate`) to `Command::new("open").arg("-a")` so the validated path is what gets spawned. No `.unwrap()` / `.expect()` permitted on these `Result`s (FR-031).
- **Files**:
  - Modify: `src-tauri/src/main.rs`
- **Dependencies**: T-002
- **Acceptance Criteria**:
  - [ ] `std::fs::canonicalize` is invoked exactly once on the candidate path.
  - [ ] Canonicalize-Err path produces a `kusa:`-prefixed stderr line and falls through.
  - [ ] is_dir/extension check produces a distinct `kusa:`-prefixed stderr line on failure and falls through.
  - [ ] `Command::arg("-a")` receives the canonicalized path.
  - [ ] No `.unwrap()` / `.expect()` introduced in this block.
- **Tests**: Manual (AC-1). Unit-testing canonicalize behavior would require touching the filesystem; intentionally skipped.
- **Effort**: Small

### T-004: Match `Command::spawn()` and fall through on failure

- **Description**: Replace `let _ = cmd.spawn(); return;` with `match cmd.spawn() { Ok(_) => return, Err(e) => { eprintln!(...failed...); eprintln!(...falling back...); /* fall through */ } }`. Ensure that when the `Err` arm executes, control reaches the existing `kusa_lib::run()` at the bottom of `main()` (i.e. do not early-return; do not nest inside another scope that ends with `return`).
- **Files**:
  - Modify: `src-tauri/src/main.rs`
- **Dependencies**: T-003
- **Acceptance Criteria**:
  - [ ] `let _ = cmd.spawn();` no longer appears.
  - [ ] `match cmd.spawn()` exists with `Ok(_) => return` and `Err(e) => { eprintln! ... }`.
  - [ ] On `Err`, control reaches `kusa_lib::run()`.
  - [ ] Both `eprintln!` lines use `kusa:` prefix and match the FR-010/FR-011 wording.
- **Tests**: Manual (AC-2). Spawn-failure cannot be reliably injected in a unit test.
- **Effort**: Small

### T-005: Refresh the block comment to mention fallback behavior

- **Description**: Update the existing block comment at lines 14-18 of `main.rs` to add a sentence: "If `open -a` spawn fails (or the bundle path is invalid), kusa falls back to in-process launch and prints a diagnostic to stderr." Keep the comment terse; this is a maintenance step so the next reader understands the fallback exists.
- **Files**:
  - Modify: `src-tauri/src/main.rs`
- **Dependencies**: T-004
- **Acceptance Criteria**:
  - [ ] Block comment mentions the fallback path and stderr diagnostics.
  - [ ] Comment is at most 8 lines.
- **Tests**: N/A.
- **Effort**: Small

### T-006: Build + lint + test verification

- **Description**: Run the full local verification suite: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build --release`, `cargo test -p kusa`. Fix any issues surfaced. This is the integration / smoke-test task.
- **Files**:
  - Modify: `src-tauri/src/main.rs` (only if lint/test fixes are needed)
- **Dependencies**: T-005
- **Acceptance Criteria**:
  - [ ] `cargo fmt --check` passes in `src-tauri/`.
  - [ ] `cargo clippy --all-targets -- -D warnings` passes in `src-tauri/`.
  - [ ] `cargo build --release` succeeds in `src-tauri/`.
  - [ ] `cargo test -p kusa` passes (including the new `extract_app_path` tests).
- **Tests**: All tests added in T-001 must pass.
- **Effort**: Small

## File Conflict Matrix

| Task  | Files                          | Conflicts With                         |
|-------|--------------------------------|----------------------------------------|
| T-001 | src-tauri/src/main.rs          | T-002, T-003, T-004, T-005, T-006      |
| T-002 | src-tauri/src/main.rs          | T-001, T-003, T-004, T-005, T-006      |
| T-003 | src-tauri/src/main.rs          | T-001, T-002, T-004, T-005, T-006      |
| T-004 | src-tauri/src/main.rs          | T-001, T-002, T-003, T-005, T-006      |
| T-005 | src-tauri/src/main.rs          | T-001, T-002, T-003, T-004, T-006      |
| T-006 | src-tauri/src/main.rs (maybe)  | All others                             |

(Single-file feature — every task touches `src-tauri/src/main.rs`. They are sequenced explicitly via the dependency chain above.)

## Requirements Traceability

| Requirement | Tasks |
|-------------|-------|
| FR-001      | T-003, T-004 |
| FR-002      | T-004 |
| FR-003      | T-004 |
| FR-004      | T-002, T-003, T-004 (preserves existing `#[cfg]` gate) |
| FR-005      | T-001, T-002 |
| FR-006      | T-003 |
| FR-010      | T-004 |
| FR-011      | T-004 |
| FR-012      | T-003 |
| FR-020      | T-002 (preserves `current_exe()` Err arm) |
| FR-021      | T-002 (preserves `None` fall-through) |
| FR-022      | T-002, T-003, T-004 (preserve `--launched` guard) |
| FR-023      | T-002, T-003, T-004 (preserve pipe-stdin guard) |
| FR-024      | T-001, T-002 |
| FR-030      | T-003, T-004 |
| FR-031      | T-003, T-004 |
| NFR-001     | T-003 |
| NFR-002     | T-003, T-004 |
| NFR-010     | T-003, T-004 |
| NFR-011     | T-002, T-003, T-004 |
| NFR-020     | T-001 |
| NFR-021     | T-001 |
| NFR-030     | All tasks |
| NFR-031     | T-003, T-004 |
| NFR-040     | T-002, T-003, T-004 (preserve `#[cfg]` gate) |
| NFR-041     | Same |
| NFR-042     | All tasks (do not touch `--version` block) |
| AC-1        | T-003 + T-006 (build) |
| AC-2        | T-004 + manual review |
| AC-3        | T-001 |
| AC-4        | T-006 (no regression) |
| AC-5        | T-001, T-006 |
| AC-6        | T-006 |
| AC-7        | T-002, T-003, T-004 (preserve guards) |

## Open Questions

None.

## Suggested Next Step

`/kiro:ao-run fix-cli-relaunch-spawn` — autonomous implementation via the AO orchestrator under the `solo-full-auto` preset.
