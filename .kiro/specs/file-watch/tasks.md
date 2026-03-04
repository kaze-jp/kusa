# Implementation Plan

## Tasks

- [x] 1. Rust バックエンド: ファイルウォッチャー
- [x] 1.1 `notify` クレートを Cargo.toml に追加する
- [x] 1.2 `src-tauri/src/watcher.rs` モジュールを作成する
  - `FileWatcher` 構造体 (notify の RecommendedWatcher をラップ)
  - Tauri AppHandle を保持しイベント送信
  - `start_watching(path)` で監視開始
  - `stop_watching()` で監視停止
  - 300ms デバウンスロジック
  - `file-changed` イベント送信（Modify 検知）
  - `file-deleted` イベント送信（Remove 検知）
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3_

- [x] 1.3 IPC コマンドを commands.rs に追加する
  - `start_file_watch(path)` コマンド
  - `stop_file_watch()` コマンド
  - FileWatcher を Tauri managed state として管理
  - _Requirements: 4.1, 4.2_

- [x] 1.4 lib.rs にコマンド登録・状態管理を追加する
  - watcher モジュール宣言
  - FileWatcherState の管理
  - invoke_handler にコマンド追加
  - _Requirements: 4.1, 4.3_

- [x] 2. フロントエンド: ファイルウォッチャーサービス
- [x] 2.1 `src/lib/fileWatcher.ts` を作成する
  - `file-changed` / `file-deleted` Tauri イベントのリスナー
  - ファイル変更時: `read_file` IPC で再読み込み → markdown 更新
  - ファイル削除時: エラー通知表示
  - isDirty 状態チェックで衝突警告
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2_

- [x] 2.2 App.tsx に統合する
  - ファイルオープン時に `start_file_watch` を呼び出し
  - ファイル切り替え/クローズ時に `stop_file_watch` を呼び出し
  - 衝突通知 UI の追加
  - _Requirements: 4.1, 4.2, 4.3_
