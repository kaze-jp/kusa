# Requirements: fix-cli-relaunch-spawn

## Document Info

- Feature: fix-cli-relaunch-spawn
- Status: Draft
- Created: 2026-05-27
- Linked Issue: #68

## Overview

macOS リリースビルドの `kusa <file>` 起動時、`open -a` による relaunch が失敗すると現状は spawn 結果が捨てられ、ウィンドウが出ないまま CLI プロセスだけが return してしまう。
本機能はこのサイレント失敗を解消する。
具体的には、(a) spawn 失敗をユーザーに通知し、(b) in-process fallback で必ずウィンドウを開き、(c) `.app/` バンドル path 抽出を `rfind` ベースに変更したうえで実在性を検証する。

## Functional Requirements

### Core Behavior

- **FR-001 (Event-driven)**: When `kusa` is invoked on a macOS release build with `--launched` absent and stdin is not a pipe, the system shall attempt to relaunch the application bundle via `open -a <app_path> --args --launched <user_args>`.
- **FR-002 (Event-driven)**: When the relaunch is attempted and `Command::spawn()` returns `Ok`, the system shall return from `main()` immediately so that the CLI process detaches.
- **FR-003 (Event-driven)**: When the relaunch is attempted and `Command::spawn()` returns `Err(e)`, the system shall fall through to in-process execution by calling `kusa_lib::run()` instead of returning silently.
- **FR-004 (Ubiquitous)**: The relaunch code path shall remain compiled out for non-macOS targets and for debug builds, by preserving the `#[cfg(all(not(debug_assertions), target_os = "macos"))]` gate.
- **FR-005 (Event-driven)**: When extracting the application bundle path from the current executable path string, the system shall locate the substring `".app/"` using a trailing-match strategy (i.e. last occurrence) so that nested or duplicated `.app/` substrings do not cause an incorrect prefix to be selected.
- **FR-006 (Event-driven)**: When the extracted candidate bundle path does not exist on the filesystem, or cannot be canonicalized to a directory ending in `.app`, the system shall skip the `open -a` relaunch and fall through to in-process execution.

### User Interactions (CLI / stderr surface)

- **FR-010 (Event-driven)**: When `Command::spawn()` fails, the system shall print a single human-readable error line to stderr that contains the prefix `kusa:`, the verb `failed to relaunch`, the attempted `app_path`, and the underlying `std::io::Error` display.
- **FR-011 (Event-driven)**: When the system falls back to in-process execution after spawn failure, it shall print a second `kusa:`-prefixed informational line to stderr stating that the fallback path is being taken and warning that the CLI process will not detach.
- **FR-012 (Event-driven)**: When the candidate bundle path validation fails (FR-006), the system shall print a `kusa:`-prefixed warning line to stderr identifying the invalid path before falling through, so that the failure mode is debuggable.

### Edge Cases

- **FR-020 (Event-driven)**: When `std::env::current_exe()` returns `Err`, the system shall not attempt to extract a bundle path and shall fall through to in-process execution. (Preserves current behavior.)
- **FR-021 (Event-driven)**: When the current executable path does not contain `".app/"` at all, the system shall fall through to in-process execution without producing an error message. (Preserves current behavior — typical for developer test builds invoked directly.)
- **FR-022 (Event-driven)**: When `args.iter().any(|a| a == "--launched")` is true, the system shall not enter the relaunch block and shall proceed to `kusa_lib::run()`. (Preserves the existing infinite-relaunch-loop guard.)
- **FR-023 (Event-driven)**: When stdin is a pipe (`S_IFIFO`), the system shall not enter the relaunch block and shall proceed to `kusa_lib::run()`. (Preserves the existing piped-stdin behavior.)
- **FR-024 (Event-driven)**: When the executable path contains multiple `.app/` substrings (e.g. `/Applications/Foo.app/Contents/Frameworks/Bar.app/Contents/MacOS/kusa`), the system shall select the prefix terminating at the **last** `.app/` so that the spawn target is the inner-most bundle that owns the running binary.

### Error Handling

- **FR-030 (Event-driven)**: If any step inside the relaunch block panics or returns an unrecoverable error not otherwise specified, the system shall not crash the CLI process; instead, control shall fall through to `kusa_lib::run()`. (Implemented by structuring the relaunch as a best-effort path with explicit fallback, not by `unwrap()`.)
- **FR-031 (Ubiquitous)**: The system shall not use `.unwrap()` or `.expect()` on the `Command::spawn()` Result or on the `canonicalize`/`metadata` Result inside the relaunch block.

## Non-Functional Requirements

### Performance

- **NFR-001 (Ubiquitous)**: The additional path-validation work (existence check + canonicalize) shall add no more than 1 stat-class syscall on the success path. (i.e. do not stat the bundle multiple times; reuse the canonicalize result.)
- **NFR-002 (Ubiquitous)**: The fix shall not add new thread spawns, async runtimes, or sleeps to the cold-start hot path.

### Reliability

- **NFR-010 (Ubiquitous)**: The window-open success rate from `kusa <file>` invocations shall be 100% under all conditions where the in-process `kusa_lib::run()` itself can launch (i.e. spawn failure must never result in "no window").
- **NFR-011 (Ubiquitous)**: The fallback path shall not introduce an infinite loop. (The `--launched` guard is unchanged; the in-process fallback does not re-enter the relaunch block.)

### Testability

- **NFR-020 (Ubiquitous)**: The `.app/` bundle path extraction logic shall be implemented as a pure function with signature compatible with `fn extract_app_path(exe_str: &str) -> Option<&str>` (or `Option<String>`), so it can be exercised by `#[test]` cases without spawning a process or touching the filesystem.
- **NFR-021 (Ubiquitous)**: Unit tests shall cover at minimum: (i) single `.app/` in path, (ii) multiple `.app/` (rfind behavior), (iii) no `.app/` (None), (iv) `.app/` at end of path with no trailing component.

### Maintainability

- **NFR-030 (Ubiquitous)**: The fix shall be contained in `src-tauri/src/main.rs` only. No new files, no new crate dependencies, no API surface changes.
- **NFR-031 (Ubiquitous)**: All stderr messages shall be prefixed with the literal `kusa:` so they are grep-able from terminal output.

### Compatibility

- **NFR-040 (Ubiquitous)**: The fix shall not change behavior of debug builds on macOS.
- **NFR-041 (Ubiquitous)**: The fix shall not change behavior on Linux or Windows targets.
- **NFR-042 (Ubiquitous)**: The fix shall not change the `--version` / `-V` short-circuit at the top of `main()`.

## Acceptance Criteria

1. **AC-1**: On a release build of macOS, invoking `kusa <file>` where the `.app/` path extraction picks a non-existent path causes a `kusa:`-prefixed message on stderr and the application window opens via the in-process fallback.
2. **AC-2**: On a release build of macOS, if `Command::spawn()` returns `Err` for any reason, the user sees both the failure and fallback messages on stderr, and the application window opens.
3. **AC-3**: When the executable lives inside a nested `.app/` (e.g. `Outer.app/.../Inner.app/Contents/MacOS/kusa`), `extract_app_path` returns the **inner** `.app/` prefix (the one that ends with the trailing `.app`).
4. **AC-4**: Existing relaunch-success path is unchanged: when `open -a` succeeds, the CLI process returns immediately and the spawned process opens the window.
5. **AC-5**: `cargo test -p kusa` (or equivalent) executes the new `extract_app_path` unit tests and they all pass on macOS, Linux, and Windows CI.
6. **AC-6**: `cargo build --release` succeeds on macOS without new warnings (clippy clean for the touched file).
7. **AC-7**: The `--launched` infinite-loop guard, the piped-stdin guard, and the `--version` short-circuit are all preserved as-is.

## Traceability

| requirements-init item | Expanded requirements |
|------------------------|------------------------|
| FR-001 (notify on spawn failure) | FR-010, FR-011 |
| FR-002 (fall back to in-process) | FR-003, FR-030, FR-031 |
| FR-003 (use rfind for trailing `.app/`) | FR-005, FR-024, NFR-020, NFR-021 |
| FR-004 (validate canonicalize app_path) | FR-006, FR-012, NFR-001 |
| FR-005 (preserve cfg gate) | FR-004, NFR-040, NFR-041 |
| FR-006 (preserve detach on success) | FR-002, AC-4 |
| NFR-001 (pure helper for testability) | NFR-020, NFR-021 |
| NFR-002 (no regression of guards) | FR-022, FR-023, NFR-011, AC-7 |
| NFR-003 (Rust footprint minimal) | NFR-030 |
| NFR-004 (`kusa:` prefix) | FR-010, FR-011, FR-012, NFR-031 |

## Open Questions

None — Issue #68 specifies the fix in full and all initial requirements have been expanded above.
