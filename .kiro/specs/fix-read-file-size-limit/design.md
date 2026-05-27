# Technical Design: fix-read-file-size-limit

## Document Info
- Feature: fix-read-file-size-limit
- Status: Draft
- Created: 2026-05-27
- Requirements: ./requirements.md
- Related Issue: kaze-jp/kusa#72

## Architecture Overview

```
┌──────────────────────────┐                ┌────────────────────────────────────┐
│ Frontend (SolidJS)       │  invoke('read_file', path)                          │
│  - openFile() / drop /   ├──────────────► │ Tauri Backend                      │
│    CLI bootstrap         │                │  src-tauri/src/commands.rs         │
└──────────────────────────┘                │                                    │
                                            │   fn read_file(path) -> Result {   │
                                            │     1. canonicalize(path)          │
                                            │     2. metadata(canonical) ◄─ NEW  │
                                            │     3. if len > MAX_FILE_SIZE      │
                                            │          return Err("File too      │
                                            │              large …")     ◄─ NEW  │
                                            │     4. read_to_string(canonical)   │
                                            │   }                                │
                                            └────────────────────────────────────┘
```

唯一の追加処理は **「`read_to_string` を呼ぶ前に `metadata().len()` で size を確認し、`MAX_FILE_SIZE` 超過なら早期 `Err`」** という 1 ガード。アーキテクチャ的な複雑性は増えず、Rust 側を「最小限に保つ」プロジェクト原則と整合する。

## Component Design

### Component: `MAX_FILE_SIZE` (module-level constant)

- **Purpose**: 読み込み可能な最大ファイルサイズを 64 MiB に固定する単一情報源。
- **Location**: `src-tauri/src/commands.rs` (module top, 既存の `SKIP_DIRS` 定義近辺)。
- **Dependencies**: なし (`std` 内のみ)。
- **Interface**:
  ```rust
  /// Maximum file size accepted by `read_file` (64 MiB).
  /// Files larger than this are rejected before being read into memory,
  /// to prevent OOM panics from accidentally opening huge non-markdown files.
  pub(crate) const MAX_FILE_SIZE: u64 = 64 * 1024 * 1024;
  ```
- **Rationale**: 定数化することでテストからも同じ値を参照でき、上限変更時の重複編集を防ぐ。`pub(crate)` でテストモジュール (`#[cfg(test)] mod tests` は同 crate 内) から参照可能。

### Component: `read_file` (修正対象 Tauri command)

- **Purpose**: フロントエンドからの「ファイルを開く」リクエストを受けて UTF-8 文字列を返す。今回サイズ上限ガードを追加する。
- **Location**: `src-tauri/src/commands.rs:48-55` (既存ブロック差し替え)。
- **Dependencies**: `std::fs` のみ (既存のまま)。新規 crate なし。
- **Interface (変更後)**:
  ```rust
  #[tauri::command]
  pub fn read_file(path: String) -> Result<String, String> {
      let canonical = fs::canonicalize(&path)
          .map_err(|e| format!("Cannot resolve path '{}': {}", path, e))?;

      let metadata = fs::metadata(&canonical)
          .map_err(|e| format!("Cannot stat file '{}': {}", canonical.display(), e))?;

      if metadata.len() > MAX_FILE_SIZE {
          return Err(format!(
              "File too large: {} bytes (max {} bytes)",
              metadata.len(),
              MAX_FILE_SIZE
          ));
      }

      fs::read_to_string(&canonical)
          .map_err(|e| format!("Cannot read file '{}': {}", canonical.display(), e))
  }
  ```
- **Rationale**:
  - `metadata.len() > MAX_FILE_SIZE` で **strict greater than** を採用 (FR-021: equal は accept)。
  - エラーメッセージは `"File too large: {actual} bytes (max {max} bytes)"` の形式 (FR-032 を満たす)。
  - `canonicalize` で path-traversal を引き続き解決し、その後の `metadata` も canonical path を使う (シンボリックリンクが指す実体のサイズを確認できる)。
  - `unwrap`/`expect` を一切使わず `?` と `map_err` で error 伝搬 (FR-033)。

## API Contracts

### Tauri command: `read_file`

- **Signature**: `fn read_file(path: String) -> Result<String, String>` (変更なし)
- **Input**:
  - `path: String` — フロントエンドから渡される任意のファイルパス。canonical 化前は相対パス・シンボリックリンクを含み得る。
- **Output**: `Ok(String)` — ファイルの UTF-8 内容。
- **Errors** (すべて `Err(String)` を返す、`panic` しない):
  | ケース | メッセージ形式 |
  |---|---|
  | canonicalize 失敗 (FR-030) | `"Cannot resolve path '<path>': <io_error>"` |
  | metadata 取得失敗 (FR-031) | `"Cannot stat file '<canonical>': <io_error>"` |
  | サイズ超過 (FR-032) | `"File too large: <actual> bytes (max <max> bytes)"` |
  | 読み込み失敗 (UTF-8 不正等) | `"Cannot read file '<canonical>': <io_error>"` (既存挙動) |
- **Example**:
  ```ts
  // Frontend
  const content = await invoke<string>('read_file', { path: '/path/to/file.md' });
  // 64 MiB 超過時:
  //   Error: "File too large: 67108865 bytes (max 67108864 bytes)"
  ```

## Data Models

このフィーチャは新規データモデルを導入しない。利用するのは `std::fs::Metadata` (既存型) のみで、参照するのは `len() -> u64` のみ。

## State Management

新規 state なし。`MAX_FILE_SIZE` は **コンパイル時定数**であり実行時 mutable state を生まない。

## Error Handling Strategy

- **エラーカテゴリ**: 既存の I/O エラー (path 解決失敗・読み込み失敗) に加え、**サイズ超過エラー**を新規追加。
- **回復戦略**: backend は `Err(String)` を返すのみ。フロントエンドは既存の `invoke` エラーパスでトースト/モーダル表示する (今回フロントエンド変更なし)。
- **メッセージ設計**: ユーザが「なぜ開けなかったのか」を即理解できるよう、`File too large` の語と実サイズ・上限を出す。バイト数は人間可読性より機械可読性 (ログ・テスト assert) を優先して `bytes` 単位で出力。
- **panic 禁止**: `?`, `map_err`, `if` による early return のみを使用。

## Testing Strategy

### Unit test targets (`src-tauri/src/commands.rs` の `#[cfg(test)] mod tests` 内)

| Test name | 目的 | 期待結果 |
|---|---|---|
| `test_read_file_success` (既存) | 正常な markdown ファイルが読める | `Ok(contents)` (壊さない) |
| `test_read_file_not_found` (既存) | 存在しないパスは `Err` | `Err`(`Cannot resolve path`) (壊さない) |
| `test_read_file_non_md` (既存) | 拡張子非 md でも本コマンドは読める | `Ok(contents)` (壊さない、本機能は extension チェックしない) |
| `test_read_file_oversize` (**新規**) | `MAX_FILE_SIZE + 1` バイトのファイルは reject | `Err` で `"File too large"` を含み、`Cannot read file` を含まないこと (= `read_to_string` まで到達していない) |

### TDD 手順 (実装フェーズで厳守)

1. `test_read_file_oversize` を**先に書く** → `cargo test test_read_file_oversize` で **red** を確認。
2. `MAX_FILE_SIZE` 定数 + size check ブロックを `read_file` に追加。
3. `cargo test` 全体で **green** を確認 (既存 3 テスト含む)。

### テストフィクスチャ生成

```rust
use std::fs::File;
let tmp = tempfile::tempdir().unwrap();
let path = tmp.path().join("huge.md");
let f = File::create(&path).unwrap();
f.set_len(MAX_FILE_SIZE + 1).unwrap();  // sparse file: 物理サイズはほぼ 0
```

- `tempfile` crate は既に dev-dependency として使われている (既存テスト群が利用) ことを前提。利用していなければ既存テストの fixture 生成方式 (`std::env::temp_dir()` + 一意名) に揃える。
- `set_len` により論理サイズだけ拡張される sparse file が作られ、テスト実行コストはミリ秒オーダー。

### Edge cases to cover

- Boundary at `MAX_FILE_SIZE` (== ちょうど 64 MiB): 受理されること — **本フィーチャでは新規テストを追加しない** (テスト中に 64MiB sparse + read_to_string まで実行すると遅くなる)。代わりに `>` 演算子の選択を design で明示し、コードレビューで担保する。
- `metadata` 失敗ケース: 既存の path-not-found テストが `canonicalize` で先に失敗するためカバー済み。`metadata` 単独失敗は OS 依存で再現困難なため明示テストは不要 (FR-031 はコード経路の存在で satisfy)。

## Security Considerations

- **DoS 緩和**: 巨大ファイル投入による OOM-kill を防ぐことで、kusa プロセスのクラッシュ耐性が向上する (NFR-011)。
- **シンボリックリンクハンドリング**: `canonicalize` で解決した後の実体に対して `metadata` を呼ぶため、symlink を介した「小さく見えるが実体は巨大」な攻撃ベクトルを防げる。
- **情報漏洩**: エラーメッセージに canonical path が含まれるが、これは既存挙動と同じ。フロントエンド側は信頼境界内のため問題なし。

## Performance Impact

- 正常ケース (< 64 MiB): `fs::metadata` 1 回 (≈ μ秒オーダー) が追加。NFR-001/NFR-002 を満たす。
- 超過ケース: `read_to_string` を完全に回避するため、従来 OOM/long-stall していたケースが μ秒で `Err` を返すように改善。NFR-003 を満たす。

## Requirements Traceability

| Requirement | Design element |
|---|---|
| FR-001 (`MAX_FILE_SIZE` 定数) | Component: `MAX_FILE_SIZE` |
| FR-002 (canonicalize 先行) | `read_file` Step 1 |
| FR-003 (metadata 先行) | `read_file` Step 2 |
| FR-004 (上限以内は read_to_string で返す) | `read_file` Step 4 |
| FR-020 (上限超過は `Err` で `read_to_string` を呼ばない) | `read_file` Step 3 (early return) |
| FR-021 (boundary inclusive) | `>` 演算子の選択 |
| FR-022 (sparse logical len も reject) | `metadata().len()` 利用 (logical size 取得) |
| FR-030 (canonicalize 失敗 Err) | 既存 `map_err` 保持 |
| FR-031 (metadata 失敗 Err) | 新規 `map_err("Cannot stat file ...")` |
| FR-032 (Err 文言: "File too large" + sizes) | `format!("File too large: {} bytes (max {} bytes)", ..)` |
| FR-033 (panic 禁止) | `?` / `map_err` / `if` only |
| NFR-001/002/003 (perf, single stat) | `fs::metadata` 1 回追加 |
| NFR-010/011 (reliability) | size guard + canonical handling |
| NFR-020 (シグネチャ不変) | `fn(path: String) -> Result<String, String>` 維持 |
| NFR-021 (新規依存なし) | `std::fs` のみ |
| NFR-030 (Tauri runtime 不要のテスト) | `#[cfg(test)] mod tests` で完結 |
| NFR-031 (sparse file fixture) | Testing Strategy セクション |
| Acceptance #1-7 | 上記全て + 修正範囲が `commands.rs` 1 ファイル |
