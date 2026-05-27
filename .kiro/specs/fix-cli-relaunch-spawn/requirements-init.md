# Feature: fix-cli-relaunch-spawn

## Overview

CLI から `kusa <file>` で起動したときに、macOS の `open -a` による relaunch が失敗した場合でもユーザーに通知し、in-process fallback で必ず起動するようにする。
あわせて、`exe_str.find(".app/")` による先頭マッチが原因で「実行ファイルとは別の `.app/` バンドル」が誤検出され spawn が失敗する経路を塞ぐ (rfind + canonicalize)。

このバグは GitHub Issue #68 で報告されている。

## Product Context

kusa は AI 開発者のためのターミナルネイティブな Markdown エディター/ビューワーである。
**Instant Open** がコアコンセプトの 1 つであり、CLI 引数 (`kusa file.md` / `kusa .`) から即座にウィンドウが出ることが体験の根幹を支えている。
relaunch がサイレントに失敗してウィンドウが出ない現状は、このコアコンセプトに直接反する critical な体験劣化である。

ターゲットユーザー: Claude Code, Cursor CLI, Kiro CLI などを使う AI 時代の開発者。彼らは "ターミナルから何かを叩く → 結果が出る" という即時性に強く依存している。

## Initial Requirements

### Functional Requirements

- **FR-001 (Event-driven)**: When `kusa <file>` is invoked on macOS release builds and the relaunch via `open -a` fails to spawn, the system shall print a human-readable error message to stderr that includes the failed `app_path` and the underlying OS error.
- **FR-002 (Event-driven)**: When the relaunch spawn fails, the system shall fall back to in-process execution by calling `kusa_lib::run()` so that a window is always shown.
- **FR-003 (Event-driven)**: When extracting the `.app/` bundle path from the current executable path, the system shall use a trailing-match strategy (`rfind(".app/")`) so that nested or duplicated `.app/` substrings (e.g. `/Applications/Foo.app/Contents/Frameworks/Bar.app/...`) do not produce an incorrect path.
- **FR-004 (Event-driven)**: When the extracted `app_path` does not exist on the filesystem or cannot be canonicalized to a directory, the system shall skip the `open -a` relaunch and fall back to in-process execution.
- **FR-005 (Ubiquitous)**: The relaunch code path shall remain a no-op on debug builds and on non-macOS targets (preserve the existing `#[cfg(all(not(debug_assertions), target_os = "macos"))]` gate).
- **FR-006 (Event-driven)**: When the relaunch spawn succeeds, the system shall return from `main()` immediately (preserve current behavior; the CLI process detaches).

### Non-Functional Requirements

- **NFR-001 (Ubiquitous)**: The `.app/` path extraction helper shall be implemented as a pure function so that it can be exercised by Rust unit tests without spawning a process.
- **NFR-002 (Ubiquitous)**: The fix shall not regress the existing infinite-relaunch-loop prevention (`--launched` flag) nor the piped-stdin detach behavior.
- **NFR-003 (Ubiquitous)**: The fix shall keep the Rust-side footprint minimal (project rule: "Rust 側は最小限") — no new crate dependencies and no architectural changes outside `src-tauri/src/main.rs`.
- **NFR-004 (Ubiquitous)**: Error messages shall be prefixed with `kusa:` to make them easy to grep from terminal output.

### Constraints

- macOS リリースビルドのみが対象 (`#[cfg(all(not(debug_assertions), target_os = "macos"))]`)。debug build は relaunch ブロック自体スキップなので影響なし。
- fallback で in-process 起動した場合、CLI プロセスは detach しない (ターミナルが占有される) が、ウィンドウが出ないより遥かに望ましい — これは明示的な受容トレードオフ。
- 変更ファイルは原則 `src-tauri/src/main.rs` 1 つに限定 (他ファイルを触る必要があるのはテスト追加でビルドターゲット構成が必要な場合のみ)。
- `git commit --no-verify` 禁止。

### Assumptions

- `.app/` バンドル path の抽出ロジックを pure helper として切り出せば Rust 単体テストでカバーできる。
- spawn 失敗そのものの単体テストは macOS 環境依存が強く現実的でないため、helper レベルでのテストと、コードレビューでの目視確認に留める。
- `kusa_lib::run()` を fallback で呼んでも既存のフローは破壊しない (現状の debug build と同じ経路を通るだけ)。

### Open Questions

- None — Issue #68 が修正方針まで明示しており、上記要件はその内容に沿って導出済み。

## Pre-canned Q&A Record

スペック初期化時に確認された 4 つの質問とその回答:

1. **What is the feature's purpose?** → 「CLI から `kusa <file>` で起動したときに、macOS の `open -a` による relaunch が失敗した場合でもユーザーに通知し、in-process fallback で必ず起動するようにする。」
2. **Who are the target users?** → 「terminal から kusa を起動するすべてのユーザー (Claude Code, Cursor CLI, Kiro CLI 等を使う AI 時代の開発者)」
3. **What problem does it solve?** → 「`open -a` の spawn 失敗が握りつぶされ、ウィンドウが出ないまま CLI プロセスだけ return してしまう。ユーザーには何も通知されず、再現条件が不明確で苦痛。」
4. **Are there any known constraints?** → 「macOS リリースビルドのみが対象。debug build は relaunch ブロック自体スキップなので影響なし。fallback で in-process 起動した場合、CLI プロセスは detach しない (ターミナルが占有される) が、ウィンドウが出ないより遥かに望ましい。」

## Related

- GitHub Issue: #68
- Affected file: `src-tauri/src/main.rs` (lines 41-42 と 79-85)
