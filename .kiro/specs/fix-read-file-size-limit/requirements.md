# Requirements: fix-read-file-size-limit

## Document Info
- Feature: fix-read-file-size-limit
- Status: Draft
- Created: 2026-05-27
- Related Issue: kaze-jp/kusa#72

## Overview

`read_file` Tauri command にファイルサイズ上限 (64 MiB) のガードを追加し、巨大ファイル (動画・ログ・大規模 JSON など、誤って `.md` として開かれるケースを含む) を読み込もうとした際に kusa プロセスがメモリ枯渇・panic・フリーズすることを防ぐ。修正は backend のみで完結し、フロントエンドの呼び出し側は変更を要さない。

## Functional Requirements

### Core Behavior

- **FR-001**: The `read_file` command shall define a compile-time constant `MAX_FILE_SIZE` equal to `64 * 1024 * 1024` bytes (64 MiB).
- **FR-002**: When `read_file` is invoked with a `path`, the command shall canonicalize the path before any further processing.
- **FR-003**: After canonicalization succeeds, the `read_file` command shall query the file's metadata via `fs::metadata` to obtain its size **before** invoking `fs::read_to_string`.
- **FR-004**: When the metadata-reported file size is less than or equal to `MAX_FILE_SIZE`, the `read_file` command shall read and return the file contents as a UTF-8 `String` (existing behavior is preserved).

### Edge Cases

- **FR-020**: When the metadata-reported file size is strictly greater than `MAX_FILE_SIZE`, the `read_file` command shall return `Err(...)` **without** calling `fs::read_to_string`.
- **FR-021**: When the metadata-reported file size equals exactly `MAX_FILE_SIZE`, the `read_file` command shall accept the file and return its contents (boundary is inclusive at the maximum).
- **FR-022**: If the file is a sparse file whose logical size (as reported by `metadata().len()`) exceeds `MAX_FILE_SIZE`, the `read_file` command shall reject it via FR-020 regardless of on-disk physical size.

### Error Handling

- **FR-030**: If `fs::canonicalize` fails, the `read_file` command shall return `Err` containing the original `path` and the underlying error (existing behavior preserved).
- **FR-031**: If `fs::metadata` fails after canonicalization succeeds, the `read_file` command shall return `Err` containing the canonical path display and the underlying error.
- **FR-032**: When the file exceeds `MAX_FILE_SIZE`, the returned `Err` string shall include the literal phrase `"File too large"`, the actual byte count, and the maximum byte count, in a single human-readable line.
- **FR-033**: The `read_file` command shall never `panic!`, `unwrap`, or `expect` on user-controlled input.

## Non-Functional Requirements

### Performance

- **NFR-001**: The size-check path shall add no more than one additional stat syscall (`fs::metadata`) compared to today's implementation.
- **NFR-002**: For normal-sized markdown files (< 1 MiB), the added overhead shall be negligible (< 1 ms on modern hardware).
- **NFR-003**: When the size check rejects a file, the command shall return without allocating a `String` for the file contents.

### Reliability

- **NFR-010**: The `read_file` command shall remain panic-free for arbitrary `path` inputs (existing path-traversal canonical-check behavior preserved by FR-002).
- **NFR-011**: The `read_file` command shall not enter unbounded memory allocation for any input on disk, regardless of file size.

### Compatibility

- **NFR-020**: The public Tauri command signature shall remain `fn read_file(path: String) -> Result<String, String>`; no frontend changes are required.
- **NFR-021**: The implementation shall not add any new crate to `src-tauri/Cargo.toml`.

### Testability

- **NFR-030**: The implementation shall be unit-testable via Rust's built-in `#[cfg(test)]` module without requiring a running Tauri runtime.
- **NFR-031**: Test fixtures for the oversize case shall be creatable as sparse files via `fs::File::set_len(MAX_FILE_SIZE + 1)` to avoid disk-space cost.

## Acceptance Criteria

1. `MAX_FILE_SIZE` is defined as `64 * 1024 * 1024` at module scope in `src-tauri/src/commands.rs`.
2. `read_file` rejects files strictly larger than `MAX_FILE_SIZE` with an `Err` containing `"File too large"`, the actual size, and the configured maximum.
3. `read_file` continues to return file contents for files at or below `MAX_FILE_SIZE` (existing happy-path tests stay green).
4. A new unit test `test_read_file_oversize` is added; it creates a sparse file of `MAX_FILE_SIZE + 1` bytes and asserts that `read_file` returns an `Err` whose message contains `"File too large"`.
5. All existing tests pass (`cargo test` in `src-tauri/`): `test_read_file_success`, `test_read_file_not_found`, `test_read_file_non_md`, plus every other existing test in the crate.
6. No additional dependency is added to `src-tauri/Cargo.toml`.
7. The implementation lives entirely within `src-tauri/src/commands.rs` (other source files unchanged).

## Traceability

| requirements-init.md | requirements.md |
|---|---|
| FR-001 (size 上限定数 + check)         | FR-001, FR-003, FR-020 |
| FR-002 (size 超過時 Err with detail)   | FR-020, FR-032 |
| FR-003 (上限以内では今と同じ動作)        | FR-004 |
| FR-004 (metadata 失敗時 Err, panic 禁止) | FR-031, FR-033, NFR-010 |
| NFR-001 (`fs::metadata().len()` 使用)   | FR-003, NFR-001, NFR-003 |
| NFR-002 (通常 markdown で遅延ほぼ無)     | NFR-002 |
| NFR-003 (新規依存なし)                  | NFR-021 |
| NFR-004 (公開シグネチャ不変)             | NFR-020 |
| Constraint (修正は commands.rs のみ)     | Acceptance Criteria #7 |
| Constraint (既存 3 テスト破壊禁止)        | Acceptance Criteria #5 |
| Constraint (TDD で新規 oversize test 追加) | Acceptance Criteria #4 |
| Assumption (sparse file の logical len)   | FR-022, NFR-031 |
