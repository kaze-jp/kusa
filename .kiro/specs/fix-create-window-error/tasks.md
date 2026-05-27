# Implementation Tasks: fix-create-window-error

## Document Info

- Feature: fix-create-window-error
- Total tasks: 5
- Parallelizable: 0 (all tasks edit the same file: `src-tauri/src/lib.rs`)
- Created: 2026-05-27
- Related issue: kusa #69

## Task Dependency Graph

```
T-001 (Full-mode fallback + show-error logging)
   │
   ▼
T-002 (setup: propagate create_window Err)
   │
   ▼
T-003 (in-file safe_default_full_size helper + tests module)
   │
   ▼
T-004 (cargo test + cargo build verification)
   │
   ▼
T-005 (commit + PR with `Closes #69`)
```

## Parallel Execution Groups

None. All implementation tasks touch `src-tauri/src/lib.rs`. They are sequenced to keep diffs reviewable.

## Tasks

### T-001: Full-mode fallback + show-error logging

- **Description**: In `src-tauri/src/lib.rs` `create_window`, replace the current Full-mode branch (lines 119–129) so that:
  1. The primary `WebviewWindowBuilder::new(...).build()` result is captured in a `match`.
  2. On `Ok(w)`, call `w.show()` and log any error via `eprintln!("Failed to show window: {}", e)` (no `.ok()` drop).
  3. On `Err(e)`, log `eprintln!("Failed to create full window: {}, retrying with safe defaults", e)` and run a safe-defaults fallback `WebviewWindowBuilder::new(app, "main", WebviewUrl::default()).title("kusa").inner_size(FULL_SIZE.width, FULL_SIZE.height).decorations(true).visible(false).build()?`.
  4. On fallback `Ok(w2)`, call `w2.show()` with the same logging treatment.
  5. Do **not** modify `WindowModeState` and do **not** emit `window-mode` from this branch (matches existing behaviour).
- **Files**: `src-tauri/src/lib.rs` (only the Full-mode branch around lines 119–129).
- **Dependencies**: None.
- **Acceptance Criteria**:
  - [ ] Primary build success path retains `.min_inner_size(400.0, 300.0)` and `.visible(false)`.
  - [ ] `window.show()` error is logged in **both** success paths (primary and fallback), not silently dropped.
  - [ ] Fallback builder uses `title("kusa")`, `inner_size(FULL_SIZE.width, FULL_SIZE.height)`, `decorations(true)`, `visible(false)`, and no `min_inner_size`.
  - [ ] Fallback `build()` `Err` is propagated via `?`.
  - [ ] `cargo build` inside `src-tauri/` succeeds after the change.
- **Tests**: deferred to T-003 (in-file helper unit tests).
- **Effort**: Small (~30 min).

### T-002: setup — propagate `create_window` Err

- **Description**: In `src-tauri/src/lib.rs` `setup` closure (around lines 246–248), change `if let Err(e) = create_window(app, &peek_config) { eprintln!("Fatal: failed to create window: {}", e); }` to additionally `return Err(e);` after the `eprintln!`. This causes Tauri to panic on fatal window-creation failure instead of silently returning `Ok(())`.
- **Files**: `src-tauri/src/lib.rs` (only the 3-line block around lines 246–248).
- **Dependencies**: T-001 (sequenced for ordering; conceptually independent).
- **Acceptance Criteria**:
  - [ ] `eprintln!("Fatal: failed to create window: {}", e)` is preserved.
  - [ ] An explicit `return Err(e);` follows the `eprintln!`.
  - [ ] `cargo build` inside `src-tauri/` still succeeds (`setup` closure return type is `Result<_, Box<dyn std::error::Error>>` which is compatible).
  - [ ] No lines outside 246–248 are modified by this task.
- **Tests**: covered by manual/runtime behaviour; unit-testable assertion is the type-checked `?`/`return Err` shape.
- **Effort**: Small (~10 min).

### T-003: in-file `safe_default_full_size` helper + `#[cfg(test)] mod tests`

- **Description**: At the bottom of `src-tauri/src/lib.rs`, add a module-private `const fn safe_default_full_size() -> window_presets::WindowSize { window_presets::FULL_SIZE }` (or use the already-imported `FULL_SIZE` symbol). Then add a `#[cfg(test)] mod tests { use super::*; ... }` block containing two tests:
  1. `safe_default_full_size_matches_full_size` — asserts width/height equal `FULL_SIZE`.
  2. `safe_default_full_size_is_positive` — asserts `width > 0.0 && height > 0.0`.
  Adjust T-001's fallback to call `safe_default_full_size()` instead of inlining `FULL_SIZE.width/height` so the helper is in the live code path (avoids dead-code warnings under non-test builds).
- **Files**: `src-tauri/src/lib.rs` (new helper near the existing top-level fns, and a new `#[cfg(test)] mod tests` at the bottom; also update T-001's fallback callsite).
- **Dependencies**: T-001.
- **Acceptance Criteria**:
  - [ ] Helper is `const fn`, module-private (no `pub`).
  - [ ] `safe_default_full_size()` is called from the Full-mode fallback path so it is exercised in non-test builds.
  - [ ] `cargo test` inside `src-tauri/` runs and the two new tests pass.
  - [ ] No new `clippy::dead_code` warnings.
- **Tests**: the two unit tests added in this task.
- **Effort**: Small (~20 min).

### T-004: verification (`cargo build` + `cargo test`)

- **Description**: From `src-tauri/`, run `cargo build` and `cargo test`. Confirm both succeed. If the workspace has additional checks (e.g., `cargo clippy`), run them too and address any new warnings introduced by this change.
- **Files**: none (verification only).
- **Dependencies**: T-001, T-002, T-003.
- **Acceptance Criteria**:
  - [ ] `cargo build` succeeds with no new errors.
  - [ ] `cargo test` succeeds and includes the two new tests.
  - [ ] `cargo clippy -- -D warnings` succeeds (if the project uses it as gate).
- **Tests**: this is the integration check.
- **Effort**: Small (~10 min).

### T-005: commit, push, PR (Closes #69)

- **Description**: Commit changes on the current worktree branch with Conventional Commits (`fix:` prefix), push to origin, then create a PR with `Closes #69` in the body. After PR creation, post `@coderabbitai review` and wait for review; address any actionable feedback by amending follow-up commits (NOT `--amend`), pushing again. Auto-merge handled by konbini `solo-full-auto` preset.
- **Files**: none (git/gh operations).
- **Dependencies**: T-004.
- **Acceptance Criteria**:
  - [ ] Commit message follows `fix: ...` Conventional Commits style.
  - [ ] `git commit --no-verify` is NOT used.
  - [ ] PR body contains the string `Closes #69`.
  - [ ] PR is created and pushed to origin.
  - [ ] CodeRabbit review is requested.
- **Tests**: CI must pass before merge (handled by konbini auto-merge gate).
- **Effort**: Small (~15 min, plus review wait time).

## File Conflict Matrix

| Task | Files | Conflicts With |
| --- | --- | --- |
| T-001 | `src-tauri/src/lib.rs` (lines 119–129 region) | T-002, T-003 |
| T-002 | `src-tauri/src/lib.rs` (lines 246–248 region) | T-001, T-003 |
| T-003 | `src-tauri/src/lib.rs` (bottom of file + T-001 callsite) | T-001, T-002 |
| T-004 | none (verification) | None |
| T-005 | none (git/gh) | None |

All implementation tasks touch the same file but in distinct regions; sequential ordering avoids merge churn within the worktree.

## Requirements Traceability

| Requirement | Tasks |
| --- | --- |
| FR-001 | T-002 |
| FR-002 | T-001 |
| FR-003 | T-001 |
| FR-004 | T-001 |
| FR-005 | T-001 |
| FR-006 | (verified by inspection in T-001; Peek branch untouched) |
| FR-010 | T-001 |
| FR-011 | T-001 |
| FR-012 | T-002 |
| FR-020 | T-001 |
| FR-021 | T-001 |
| FR-030 | T-001 (verification — Peek primary path unchanged) |
| FR-031 | T-001 (verification — existing `build()?` preserved) |
| NFR-001 | T-001, T-002, T-003 |
| NFR-002 | T-001, T-002 |
| NFR-003 | T-001, T-002 (lines 183–191 untouched by all tasks) |
| NFR-010 | T-001 |
| NFR-011 | T-001 |
| NFR-020 | T-003 |
| NFR-021 | T-003 |
| NFR-030 | T-005 |
| NFR-031 | T-005 |

## Coordination notes (vs sibling issue #70)

Issue #70 modifies `src-tauri/src/lib.rs` lines 183–191 and adds new commands in `commands.rs`. Our line ranges (119–129, 246–248, bottom of file) do not overlap. If a rebase conflict appears, preserve both sets of changes.
