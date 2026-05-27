# Implementation Tasks: fix-read-file-size-limit

## Document Info
- Feature: fix-read-file-size-limit
- Total tasks: 4
- Parallelizable: 0 (全タスクが `src-tauri/src/commands.rs` の同一領域を触るため逐次実行)
- Created: 2026-05-27
- Related Issue: kaze-jp/kusa#72

## Task Dependency Graph

```
T-001 (red test) ──► T-002 (impl: const + size guard) ──► T-003 (green verify) ──► T-004 (commit & PR)
```

すべて同じファイル (`src-tauri/src/commands.rs`) を編集するため、論理的に **逐次実行のみ**。並列化グループは存在しない。

## Parallel Execution Groups

- **Group 1 (serial)**: T-001 → T-002 → T-003 → T-004

## Tasks

### T-001: Add failing oversize unit test (TDD red)

- **Description**: `#[cfg(test)] mod tests` に `test_read_file_oversize` を追加する。`tempfile::TempDir` 内に sparse file (`MAX_FILE_SIZE + 1` バイト) を `File::create` + `set_len` で作成し、`read_file` を呼び出して `Err` が返ること & そのメッセージに `"File too large"` を含むことを assert する。**この時点ではまだ `MAX_FILE_SIZE` 定数も size check 実装も追加しない**ため、テストは初期状態では存在しない定数を参照しコンパイルエラーになる。
- **Files**: `src-tauri/src/commands.rs` (test モジュールのみ)
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] `test_read_file_oversize` テスト関数が `#[cfg(test)] mod tests` 内に追加されている。
  - [ ] テストは sparse file (`set_len(MAX_FILE_SIZE + 1)`) を fixture として使う。
  - [ ] `assert!(result.is_err())` と `assert!(err.contains("File too large"))` を含む。
  - [ ] (Red 確認) `MAX_FILE_SIZE` 未定義 or size guard 未実装の状態で `cargo test test_read_file_oversize` が **失敗** する (TDD red)。
- **Tests**: 自身がテスト追加タスク。
- **Effort**: Small

### T-002: Add `MAX_FILE_SIZE` constant + size-check in `read_file`

- **Description**: `commands.rs` モジュール上部に `pub(crate) const MAX_FILE_SIZE: u64 = 64 * 1024 * 1024;` を追加。`read_file` 関数本体に `fs::metadata` 呼び出しと `metadata.len() > MAX_FILE_SIZE` の early-return ガードを追加する (`Err` 文言は `"File too large: {} bytes (max {} bytes)"`)。`canonicalize` および最終の `fs::read_to_string` は維持。
- **Files**: `src-tauri/src/commands.rs` (production code 部分)
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] `MAX_FILE_SIZE` 定数が `pub(crate) const` で定義され、値は `64 * 1024 * 1024`。
  - [ ] `read_file` 関数に `fs::metadata(&canonical)` 呼び出しが入り、失敗時は `"Cannot stat file '...': ..."` を返す。
  - [ ] サイズ超過判定が `metadata.len() > MAX_FILE_SIZE` (strict greater than) で実装されている。
  - [ ] 超過時の `Err` 文言が `"File too large: {actual} bytes (max {max} bytes)"` フォーマット。
  - [ ] 関数の戻り値型・シグネチャ (`fn(path: String) -> Result<String, String>`) は変更されていない。
  - [ ] `unwrap()`, `expect()`, `panic!()` を新規追加していない。
- **Tests**: T-003 で全体テスト実行。
- **Effort**: Small

### T-003: Verify all tests green & no regressions

- **Description**: `cd src-tauri && cargo test` を実行し、新規 `test_read_file_oversize` を含むすべてのテストが pass することを確認。既存 `test_read_file_success`, `test_read_file_not_found`, `test_read_file_non_md` も green であることを確認。さらに `cargo clippy --all-targets -- -D warnings` および `cargo fmt -- --check` (もしプロジェクト hook で必要なら) を実行して lint clean を確認。
- **Files**: なし (verification only)
- **Dependencies**: T-002
- **Acceptance Criteria**:
  - [ ] `cargo test` が成功 (failed: 0)。
  - [ ] `test_read_file_oversize`, `test_read_file_success`, `test_read_file_not_found`, `test_read_file_non_md` の 4 件がすべて pass。
  - [ ] `cargo clippy` が warning 0 (もしくは新規 warning なし)。
  - [ ] `cargo fmt --check` が clean (フォーマットの逸脱なし)。
- **Tests**: 既存テストスイート全体。
- **Effort**: Small

### T-004: Commit, push, open PR with `Closes #72`

- **Description**: spec ファイル (`requirements-init.md`, `requirements.md`, `design.md`, `tasks.md`) と実装 (`src-tauri/src/commands.rs`) を Conventional Commits 形式でコミット → push → GitHub PR 作成。PR body には `Closes #72` を含め、`solo-full-auto` プリセットに従い CodeRabbit レビュー要請まで自動で進める。
- **Files**: なし (git/gh のみ; `--no-verify` 禁止)
- **Dependencies**: T-003
- **Acceptance Criteria**:
  - [ ] Conventional Commits 形式のコミットメッセージ (例: `fix: enforce 64MB size limit in read_file command (closes #72)`)。
  - [ ] `git commit --no-verify` を使っていない。
  - [ ] PR が open され、本文に `Closes #72` を含む。
  - [ ] PR description に変更概要・テスト結果が記載されている。
- **Tests**: PR の CI が green。
- **Effort**: Small

## File Conflict Matrix

| Task | Files | Conflicts With |
|------|-------|---------------|
| T-001 | `src-tauri/src/commands.rs` (test mod) | T-002 (同一ファイル) |
| T-002 | `src-tauri/src/commands.rs` (top + read_file) | T-001 (同一ファイル) |
| T-003 | なし (verification) | None |
| T-004 | なし (git/gh) | None |

→ T-001 と T-002 は同一ファイルを編集するため逐次実行のみ。並列実行可能なタスクなし。

## Requirements Traceability

| Requirement | Tasks |
|------------|-------|
| FR-001 (`MAX_FILE_SIZE` 定数) | T-002 |
| FR-002 (canonicalize 先行) | T-002 (既存維持) |
| FR-003 (metadata 先行取得) | T-002 |
| FR-004 (上限以内は contents 返却) | T-002 (既存維持), T-003 (`test_read_file_success` で検証) |
| FR-020 (上限超過は early `Err`) | T-001 (red), T-002 (実装), T-003 (green) |
| FR-021 (boundary inclusive) | T-002 (`>` 演算子の選択) |
| FR-022 (sparse logical len reject) | T-001 (sparse fixture でテスト), T-002 (`metadata().len()` で判定) |
| FR-030 (canonicalize 失敗 Err) | T-002 (既存維持), T-003 (`test_read_file_not_found` で検証) |
| FR-031 (metadata 失敗 Err) | T-002 |
| FR-032 (Err 文言: "File too large" + sizes) | T-001 (assert), T-002 (format!) |
| FR-033 (panic 禁止) | T-002 (`?` + `map_err` のみ) |
| NFR-001/002/003 (perf, single stat) | T-002 |
| NFR-010/011 (reliability) | T-002 |
| NFR-020 (signature 不変) | T-002 |
| NFR-021 (新規依存なし) | T-002 (使うのは `std::fs` のみ) |
| NFR-030 (Tauri runtime 不要のテスト) | T-001 |
| NFR-031 (sparse file fixture) | T-001 |
| Acceptance #1 (定数定義) | T-002 |
| Acceptance #2 (超過時 Err 文言) | T-001, T-002 |
| Acceptance #3 (既存挙動維持) | T-003 |
| Acceptance #4 (oversize test 追加) | T-001 |
| Acceptance #5 (全テスト pass) | T-003 |
| Acceptance #6 (依存追加なし) | T-002 |
| Acceptance #7 (commands.rs 1 ファイルのみ) | T-001, T-002 |
