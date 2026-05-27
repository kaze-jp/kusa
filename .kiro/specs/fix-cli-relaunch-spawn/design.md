# Technical Design: fix-cli-relaunch-spawn

## Document Info

- Feature: fix-cli-relaunch-spawn
- Status: Draft (auto-approved via `-y`)
- Created: 2026-05-27
- Requirements: ./requirements.md
- Linked Issue: #68

## Architecture Overview

This is a localized fix to the macOS release-build relaunch path in `src-tauri/src/main.rs`.
No new architectural layers, no new files, no new crate dependencies. The change rewrites the existing block guarded by `#[cfg(all(not(debug_assertions), target_os = "macos"))]` so it (a) extracts the `.app/` path via `rfind`, (b) validates the candidate by canonicalization, and (c) handles `Command::spawn()` failure by falling through to `kusa_lib::run()` with stderr diagnostics.

```text
                        kusa <file>  (CLI invocation)
                              │
                              ▼
                ┌─────────────────────────────┐
                │   main()                    │
                └─────────────────────────────┘
                              │
       ┌──────────────────────┼───────────────────────┐
       ▼                      ▼                       ▼
  --version/-V?         #[cfg(release+mac)]      (other targets)
       │                   relaunch block             │
       │              ┌──────────────────┐            │
       │              │ already_launched │            │
       │              │ stdin is pipe?   │            │
       │              └──────────────────┘            │
       │                   │ no                       │
       │                   ▼                          │
       │     ┌─────────────────────────────────┐      │
       │     │ extract_app_path(exe_str)       │      │
       │     │   uses rfind(".app/")           │      │
       │     └─────────────────────────────────┘      │
       │                   │ Some(path)               │
       │                   ▼                          │
       │     ┌─────────────────────────────────┐      │
       │     │ canonicalize + is_dir + ends    │      │
       │     │ with ".app"?                    │      │
       │     └─────────────────────────────────┘      │
       │              │              │                │
       │              │ ok           │ fail           │
       │              ▼              ▼                │
       │      Command::new("open")  warn + fall-through
       │              .spawn()      │                 │
       │              │             │                 │
       │       ┌──────┴──────┐      │                 │
       │       │ Ok          │ Err  │                 │
       │       │             ▼      │                 │
       │       │   eprintln!(err)+ fall-through       │
       │       │             │      │                 │
       │       ▼             ▼      ▼                 ▼
       │   return     ─────────────────────► kusa_lib::run()
       │
       └──────► println!("kusa <ver>"); return;
```

## Component Design

### Component: `extract_app_path` (new pure helper)

- **Purpose**: Given the path string of the current executable, return the prefix that names the owning `.app` bundle, using a trailing-match strategy.
- **Location**: `src-tauri/src/main.rs` (new free function near `main`, marked `#[cfg(all(not(debug_assertions), target_os = "macos"))]` or compiled unconditionally to keep tests runnable on all platforms — see Testing Strategy below for the chosen variant).
- **Dependencies**: `std::str` only.
- **Interface**:
  ```rust
  fn extract_app_path(exe_str: &str) -> Option<&str>;
  ```
- **Rationale for pure-helper extraction**: Issue #68 specifies that the new logic must be testable. Pulling the substring math into a free function lets us write `#[test]` cases without spawning a process or relying on a real `.app` bundle on disk.

### Component: relaunch block in `main()` (rewrite of lines 79-85, with the line-41 fix)

- **Purpose**: Best-effort detach-relaunch via `open -a`; never silently fails.
- **Location**: `src-tauri/src/main.rs`, inside `#[cfg(all(not(debug_assertions), target_os = "macos"))]`.
- **Dependencies**: `std::env`, `std::process::Command`, `std::path::Path`, `std::fs::canonicalize`, the existing `extract_app_path` helper.
- **Interface**: Internal — no public surface change.
- **Behavior outline (pseudo-code, not implementation)**:
  ```text
  let Ok(exe) = current_exe() else { goto fallback };
  let exe_str = exe.to_string_lossy();
  let Some(candidate) = extract_app_path(&exe_str) else { goto fallback };

  // FR-006: verify it really is a .app bundle on disk
  let Ok(canonical) = fs::canonicalize(candidate) else {
      eprintln!("kusa: candidate bundle path '{candidate}' is not accessible; falling back");
      goto fallback;
  };
  if !canonical.is_dir()
     || canonical.extension().and_then(|s| s.to_str()) != Some("app")
  {
      eprintln!("kusa: candidate bundle path '{}' is not a .app bundle; falling back",
                canonical.display());
      goto fallback;
  }

  let resolved_args = resolve_user_args(...);  // existing logic, unchanged

  let mut cmd = Command::new("open");
  cmd.arg("-a").arg(&canonical).arg("--args").arg("--launched").args(&resolved_args);
  match cmd.spawn() {
      Ok(_) => return,
      Err(e) => {
          eprintln!("kusa: failed to relaunch via `open -a {}`: {e}", canonical.display());
          eprintln!("kusa: falling back to in-process launch (CLI process will not detach)");
          // fall through to kusa_lib::run()
      }
  }
  // fallback:  (single label conceptually; in Rust, structure the function so control
  // naturally reaches kusa_lib::run() at the bottom of main())
  ```

## API Contracts

### `fn extract_app_path(exe_str: &str) -> Option<&str>`

- **Signature**: `fn extract_app_path(exe_str: &str) -> Option<&str>`
- **Input**:
  - `exe_str`: the executable path as a `&str`, typically obtained from `std::env::current_exe().to_string_lossy()`.
- **Output**:
  - `Some(prefix)` where `prefix` is the substring of `exe_str` from index 0 through the **last** occurrence of `".app/"` plus 4 (i.e. including the trailing `.app` but excluding the `/`).
  - `None` if `exe_str` does not contain `".app/"`.
- **Errors**: None. Pure function.
- **Examples** (illustrative; the unit tests in NFR-021 are the source of truth):
  - `"/Applications/kusa.app/Contents/MacOS/kusa"` → `Some("/Applications/kusa.app")`
  - `"/Applications/Outer.app/Contents/Frameworks/Inner.app/Contents/MacOS/kusa"` → `Some("/Applications/Outer.app/Contents/Frameworks/Inner.app")`
  - `"/usr/local/bin/kusa"` → `None`
  - `"/some/path.app/"` → `Some("/some/path.app")` (degenerate but well-defined: rfind matches, slice is `[..idx+4]`)

### Stderr message contracts

All messages are single-line, `kusa:` prefixed, terminated by `\n`. Format strings (exact):

- Spawn failure (FR-010):
  `kusa: failed to relaunch via \`open -a {app_path}\`: {error}`
- Fallback notice (FR-011):
  `kusa: falling back to in-process launch (CLI process will not detach)`
- Invalid bundle (FR-012):
  `kusa: candidate bundle path '{path}' is not a .app bundle; falling back to in-process launch`
- Canonicalize failure (subset of FR-012):
  `kusa: candidate bundle path '{path}' is not accessible ({error}); falling back to in-process launch`

## Data Models

This change introduces no new persistent data models. Transient values used in the relaunch block:

| Name | Type | Source | Notes |
|------|------|--------|-------|
| `exe` | `std::path::PathBuf` | `std::env::current_exe()` | Already used in current code. |
| `exe_str` | `String` | `exe.to_string_lossy().to_string()` | Already used. |
| `candidate` | `&str` | `extract_app_path(&exe_str)` | New. Borrowed slice into `exe_str`. |
| `canonical` | `std::path::PathBuf` | `std::fs::canonicalize(candidate)` | New. Validated bundle path. |
| `resolved_args` | `Vec<String>` | Existing args-resolution logic, unchanged | No change. |

## State Management

No state outside the stack frame of `main()`. The fix is straight-line procedural code.

## Error Handling Strategy

The fix follows a "best-effort detach, guaranteed window" strategy:

| Error point | Strategy | User-facing surface |
|-------------|----------|----------------------|
| `current_exe()` returns `Err` | Fall through to `kusa_lib::run()` silently | None (matches current behavior) |
| `extract_app_path` returns `None` | Fall through silently | None (e.g. running from `cargo run` test build — already legal) |
| `canonicalize` returns `Err` | Print FR-012 message, fall through | stderr line |
| `canonical` not a `.app` directory | Print FR-012 message, fall through | stderr line |
| `Command::spawn()` returns `Err` | Print FR-010 + FR-011 lines, fall through | 2 stderr lines |
| `kusa_lib::run()` itself fails | Out of scope for this fix — existing app-level handling | n/a |

Recovery in every case is the same: call `kusa_lib::run()`. The user sees a window. The terminal occupancy trade-off (no detach when fallback fires) is explicitly accepted per Issue #68.

## Testing Strategy

### Unit tests (added in this PR)

Implemented in `src-tauri/src/main.rs` under `#[cfg(test)] mod tests`. Because the relaunch block itself is gated on `#[cfg(all(not(debug_assertions), target_os = "macos"))]` and `cargo test` runs in debug mode by default, the **helper `extract_app_path` must be available unconditionally** (not behind `#[cfg]`) so the tests run on all platforms in CI. The helper has no platform-specific dependencies, so this is safe.

Test cases (NFR-021):

1. `extract_app_path_single_bundle` — `"/Applications/kusa.app/Contents/MacOS/kusa"` → `Some("/Applications/kusa.app")`
2. `extract_app_path_nested_bundles` — `"/Outer.app/Frameworks/Inner.app/Contents/MacOS/kusa"` → `Some("/Outer.app/Frameworks/Inner.app")`
3. `extract_app_path_no_bundle` — `"/usr/local/bin/kusa"` → `None`
4. `extract_app_path_trailing_slash` — `"/path/foo.app/"` → `Some("/path/foo.app")`
5. `extract_app_path_empty_string` — `""` → `None`
6. `extract_app_path_app_in_middle_only` — `"/path/foo.app.backup/kusa"` → `None` (no `".app/"` substring; the dot-suffix `.app.backup` must not match)

### Integration / manual verification (out of unit scope, documented for the implementer)

- AC-1: Build a release binary, rename the bundle to break the canonicalize step (e.g. move it to a temp dir then point a copy of the executable elsewhere), invoke from terminal, observe stderr + window opens.
- AC-2: Replace `/usr/bin/open` PATH with a stub returning non-zero / removing exec permission in a sandbox, invoke, observe failure message + window opens. (Difficult to script in CI; performed by reviewer if practical.)
- AC-4: Normal install path via Homebrew tap, invoke `kusa README.md`, observe CLI returns immediately and window opens.
- AC-7: `kusa --version` still prints the version and returns, both in debug and release.

### Lint / build

- `cargo fmt --check` on `src-tauri/`
- `cargo clippy -- -D warnings` on `src-tauri/`
- `cargo build --release` on macOS
- `cargo test` on macOS (and on Linux CI for the pure-helper tests)

## Security Considerations

- The fix narrows trust on the path used in `open -a`: previously any string ending in `.app/` from `find` was accepted; now the path must canonicalize and resolve to a real directory whose extension is `.app`. This is a strict improvement.
- No new attack surface introduced. `kusa_lib::run()` is the same code path debug builds already use.
- No new dependencies, so no new supply-chain exposure.

## Implementation Notes (constraints reminder)

- Single-file change: `src-tauri/src/main.rs`. No new crates, no other source modifications.
- Preserve all existing comments unless they become factually wrong; update the block-comment at line 14-18 to mention the fallback if substantive.
- Use `eprintln!` (not `println!`) — these are diagnostic messages, not stdout output.
- Do **not** introduce `Box<dyn Error>`, `anyhow`, `thiserror`, etc. The existing code uses plain `std`; stay consistent.
- Do **not** add `unwrap()` / `expect()` anywhere in the relaunch block. FR-031 forbids it.
- Conventional Commits: implementation commit should be `fix(cli): handle relaunch spawn failure and use rfind for app path` (or similar).

## Requirements Traceability

| Requirement | Design element |
|-------------|----------------|
| FR-001 | relaunch block — `Command::new("open").arg("-a").arg(&canonical)...` |
| FR-002 | `match spawn { Ok(_) => return, ... }` |
| FR-003 | `match spawn { ..., Err(e) => { eprintln!; fall through } }` |
| FR-004 | Preserved `#[cfg(all(not(debug_assertions), target_os = "macos"))]` gate |
| FR-005 | `extract_app_path` uses `exe_str.rfind(".app/")` |
| FR-006 | canonicalize + is_dir + extension == "app" guard |
| FR-010 | Stderr message format "kusa: failed to relaunch via `open -a {app_path}`: {error}" |
| FR-011 | Stderr message "kusa: falling back to in-process launch (CLI process will not detach)" |
| FR-012 | Stderr message "kusa: candidate bundle path '{path}' is not a .app bundle; falling back ..." |
| FR-020 | `if let Ok(exe) = current_exe()` — Err arm falls through (existing) |
| FR-021 | `extract_app_path` returns `None` → fall through silently |
| FR-022 | `already_launched` guard preserved as-is |
| FR-023 | `stdin_is_pipe` guard preserved as-is |
| FR-024 | `rfind(".app/")` selects last occurrence |
| FR-030 | All `Result`s in the block are `match`ed or `if let`; no panics introduced |
| FR-031 | No `.unwrap()` / `.expect()` on `spawn`/`canonicalize` |
| NFR-001 | Single `canonicalize` call; reuse result for `is_dir` / `extension` |
| NFR-002 | No threads/async/sleep added |
| NFR-010 | Fallback always calls `kusa_lib::run()` |
| NFR-011 | `--launched` flag passed to relaunch unchanged; fallback uses the same code as debug builds |
| NFR-020 | `extract_app_path` as `fn(&str) -> Option<&str>` |
| NFR-021 | Six unit tests enumerated in Testing Strategy |
| NFR-030 | Only `src-tauri/src/main.rs` changes; no Cargo.toml changes |
| NFR-031 | All stderr lines start with `kusa: ` |
| NFR-040 | `#[cfg(...)]` gate preserved |
| NFR-041 | Same — Linux/Windows are not compiled |
| NFR-042 | `--version` block at top of `main()` untouched |

## Open Questions

None.
