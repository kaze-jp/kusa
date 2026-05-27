# Feature: fix-read-file-size-limit

## Overview

`read_file` Tauri command にファイルサイズ上限 (64MB) を追加し、巨大ファイルを開いた際に OOM panic / フリーズが起きないようにする。誤って video / log / 大規模 JSON 等を `.md` として開くケースや、本当に巨大な markdown を開くケースで kusa プロセスがクラッシュする問題を防ぐ。

## Product Context

kusa は「Markdown を読む/書く/レビューする体験を再定義する軽量・高速エディター」であり、CLI 起動・ドラッグ&ドロップ・ファイルピッカーを介したファイルオープンが Instant Open の中核体験。読み込み経路がクラッシュすると即 UX を毀損するため、信頼性の確保は P0 級の安定性課題である。

(`.ao/steering/product.md` は現状テンプレートのままで具体的記述なし。プロダクト原則「軽量・高速・即起動」を前提に判断する。)

## Initial Requirements

### Functional Requirements

- **FR-001**: The `read_file` command shall enforce a maximum file size of 64 MiB (`64 * 1024 * 1024` bytes) before reading file contents.
- **FR-002**: When the target file's size exceeds the maximum, the `read_file` command shall return an `Err` containing a human-readable message including the actual file size and the configured maximum.
- **FR-003**: When the target file's size is within the maximum, the `read_file` command shall return its UTF-8 contents as today (behavior preservation).
- **FR-004**: If file metadata cannot be obtained (e.g. permission error after canonicalize), the `read_file` command shall return an `Err` with an explanatory message rather than panicking.

### Non-Functional Requirements

- **NFR-001**: The `read_file` command shall perform the size check using `fs::metadata().len()` to avoid loading file contents into memory before validation.
- **NFR-002**: The `read_file` command's size check shall add negligible latency (single stat syscall) for normal-sized markdown files.
- **NFR-003**: The implementation shall not introduce additional dependencies.
- **NFR-004**: The implementation shall not change the public Tauri command signature (`fn(path: String) -> Result<String, String>`), so frontend callers require no changes.

### Constraints

- 修正対象は **`src-tauri/src/commands.rs` のみ**。
- 上限は **`MAX_FILE_SIZE = 64 * 1024 * 1024` (64 MiB)** に固定 (markdown 用途として十分大きい)。
- 既存テスト 3 件 (`test_read_file_success`, `test_read_file_not_found`, `test_read_file_non_md`) を破壊しない。
- 新規テスト `test_read_file_oversize` を **TDD で先に書き red → green** を確認する。
- 拡張子チェック (.md 以外を弾く) と async 化はスコープ外。
- `git commit --no-verify` 禁止。Conventional Commits を遵守。

### Assumptions

- `fs::File::set_len(MAX_FILE_SIZE + 1)` で生成した sparse file の `metadata().len()` は論理サイズ (`MAX_FILE_SIZE + 1`) を返す (macOS APFS / Linux ext4 等で標準動作)。これによりテストファイルを実際に 64MB+ 書き込まずに作成可能。
- フロントエンドは `read_file` の `Err` を既にトースト/エラーメッセージとして表示できる経路を持っている (今回は backend だけで十分)。
- ファイル読み込み中の中断は不要 (size check 失敗時は即 `Err` を返すだけ)。

### Open Questions

- なし。issue #72 で fix の方針 (size check 追加・テスト追加・extension チェックと async はスコープ外) が確定済み。
