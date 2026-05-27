# Feature: fix-single-instance-race

## Overview

single-instance plugin の callback が `.setup()` 完了前 (window 作成前) に呼ばれることで発生する race condition を修正する。具体的には、起動直後に 2nd instance を CLI で叩くと `app.get_webview_window("main")` が `None` を返し、`resolve_and_emit` が emit する `cli-open` / `cli-open-dir` イベントが frontend listener 不在のため捨てられる問題に対応する。

修正方針は「pending event を Rust 側で buffer し、frontend listener セットアップ完了後に `flush_pending_events` コマンドを invoke して flush する」というアプローチを採る。

## Product Context

product.md はテンプレートのままで具体的な内容は未記入。本プロジェクト (kusa) のビジョンは CLAUDE.md の通り「ターミナル AI 開発者向けの軽量・高速 Markdown エディター」。**Instant Open** がコアコンセプトであり、CLI から `kusa file.md` で即起動できる体験が壊れる本バグは UX 価値の中核を毀損する。

## Initial Requirements

### Functional Requirements

- **FR-001**: When the user runs `kusa <path>` while a kusa instance is already running, the system shall open / focus to `<path>` in the existing instance.
- **FR-002**: When the single-instance plugin callback is invoked **before** the main webview window is created, the system shall buffer the `(event_name, payload)` pair in process-local state (`PendingEventBuffer`) instead of emitting it.
- **FR-003**: When the single-instance plugin callback is invoked **after** the main webview window is created, the system shall emit `cli-open` / `cli-open-dir` via the existing `resolve_and_emit` flow (current behaviour preserved).
- **FR-004**: After the frontend `setupTauriListeners` finishes registering all Tauri event listeners, the frontend shall invoke a new Tauri command `flush_pending_events`.
- **FR-005**: When `flush_pending_events` is invoked, the backend shall drain `PendingEventBuffer` and re-emit each buffered `(event_name, payload)` pair via `app.emit(...)`.
- **FR-006**: While `resolve_and_emit` runs, if the underlying `emit` call returns an `Err`, the system shall log the error via `eprintln!` (so users / CI can diagnose silent failures).
- **FR-007**: Where the main webview window exists at the time of single-instance callback, the system shall call `window.set_focus()` (current behaviour preserved).

### Non-Functional Requirements

- **NFR-001**: The buffer (`PendingEventBuffer`) shall be protected by a `std::sync::Mutex`; concurrent access from the single-instance callback thread and the IPC handler thread shall not cause data races or undefined behaviour.
- **NFR-002**: The fix shall not regress the cold-start latency of the 1st instance: no additional work shall be done on the happy path beyond a buffer state registration in `Builder::manage`.
- **NFR-003**: The fix shall not introduce duplicate `cli-open` / `cli-open-dir` events for the 1st instance (the 1st instance must not receive buffered events that would re-trigger the file already being opened via `get_cli_args`).
- **NFR-004**: All new and existing Rust unit tests under `src-tauri/` shall pass (`cargo test`).
- **NFR-005**: The frontend invoke shall use `.catch(() => {})` (or equivalent) so a failure of `flush_pending_events` does not break listener setup.

### Constraints

- **C-001**: `tauri_plugin_single_instance` 0.x の挙動依存 — callback signature `(app: &AppHandle, args: Vec<String>, cwd: String)` を踏襲する。
- **C-002**: `src-tauri/src/lib.rs` の **lines 119-129** (Full mode window builder) および **line 246 周辺** (`setup()` 内の `create_window` 呼び出し) は touch しない (sibling issue #69 が同じファイルを編集しており、領域を分離してマージ衝突を回避する)。
- **C-003**: `git commit --no-verify` 禁止 (pre-commit hooks を必ず通す)。
- **C-004**: `resolve_and_emit` の重複登録は避ける — 既存の関数を再利用し、新たな emit 経路を増やさない。
- **C-005**: `flush_pending_events` は frontend が必ず呼ぶ責任を負う (backend からの auto-flush は実装しない)。

### Assumptions

- **A-001**: `tauri_plugin_single_instance` の callback が `setup()` 完了前に発火するのは、OS のプロセス間通信が高速に成立した場合に限定される (確率的再現)。
- **A-002**: `PendingEventBuffer` に積まれるイベントは、frontend が listener をセットアップしてから flush されるまでの間に消費される。長期間バッファに残ることは想定しない。
- **A-003**: `app.emit(...)` の失敗は通常発生しないが、起動シーケンスの異常時にデバッグ可能であるべきという理由でログを追加する。

### Open Questions

- 現時点で重大な open question はなし。issue 本文に明示された Suggested Fix をベースに進める。

## Acceptance Criteria (Initial)

1. `cargo test` が pass する (既存テスト + 新規 `flush_pending_events` の unit test)。
2. `cargo build --release` が warning-free で通る。
3. 既存 1st instance 起動 (`kusa file.md`) で動作が回帰しない。
4. 2nd instance ケース (`kusa a.md` → 起動直後に `kusa b.md`) で `b.md` が開く。
5. CodeRabbit レビューで critical / major 指摘なし。
