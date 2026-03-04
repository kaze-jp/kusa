# Research & Design Decisions

## Summary
- **Feature**: `untitled-buffer`
- **Discovery Scope**: Extension
- **Key Findings**:
  - `tauri-plugin-dialog` が未インストール — Save As ダイアログに必要
  - Tab の id は現在 filePath を使用 — untitled には一意 ID 生成が必要
  - SyncEngine は filePath 必須 — untitled 用に preview-only モード分離が必要

## Research Log

### Tauri Dialog Plugin
- **Context**: Save As 機能に OS ネイティブのファイル保存ダイアログが必要
- **Sources Consulted**: Cargo.toml, package.json の依存関係
- **Findings**:
  - `tauri-plugin-dialog` (Rust) + `@tauri-apps/plugin-dialog` (JS) が必要
  - `save()` API でファイルパス選択ダイアログを表示可能
  - フィルタ設定で `.md` ファイルに制限可能
- **Implications**: 新規依存の追加が必要（Cargo.toml + package.json + capabilities）

### TabStore の拡張方針
- **Context**: 現在の Tab.id は filePath を使用、untitled タブには filePath がない
- **Findings**:
  - Tab interface に `isUntitled` フラグ追加で最小限の変更
  - untitled タブの id は `untitled-{counter}` プレフィックスで一意性確保
  - `openTab` の重複チェック (filePath ベース) は untitled には非該当
  - `promoteToFile()` メソッドで untitled → file 昇格を実現
- **Implications**: Tab interface の拡張 + tabStore に 2メソッド追加

### SyncEngine の untitled 対応
- **Context**: SyncEngine は filePath 必須で auto-save する設計
- **Findings**:
  - untitled では auto-save をスキップし、preview 更新のみ必要
  - 方針: SyncEngine に `skipAutoSave` オプションを追加するか、preview-only のライトエンジンを作るか
  - 選択: `skipAutoSave` オプション追加が最小変更
  - `:w` 時は SyncEngine 外で Save As ダイアログを呼ぶ
- **Implications**: SyncEngineConfig に `skipAutoSave?: boolean` 追加

### BufferManager との関係
- **Context**: 現在の buffer.ts は stdin/clipboard/url を「読み取り専用」として管理
- **Findings**:
  - untitled バッファは buffer mode とは別概念（編集可能な新規ファイル）
  - BufferManager の変更は不要 — untitled は tabStore で管理
  - `enterEditMode` の `isBufferMode()` ガードは untitled に影響しない（untitled は file 系として扱う）
- **Implications**: buffer.ts は変更不要

## Design Decisions

### Decision: Untitled タブの識別方法
- **Alternatives**:
  1. Tab に `isUntitled` boolean フラグ追加
  2. filePath を null 許容にして null チェック
  3. 別の UntitledTab type を作成
- **Selected**: Option 1 — `isUntitled` フラグ
- **Rationale**: 最小限の interface 変更、既存コードへの影響が少ない、型安全

### Decision: Save As の実装場所
- **Alternatives**:
  1. SyncEngine 内で Save As ロジック
  2. App.tsx の handleSave で分岐
- **Selected**: Option 2 — App.tsx で分岐
- **Rationale**: SyncEngine はファイル同期に専念、Save As は UI フローなので App レベルが適切

### Decision: +ボタンの配置
- **Alternatives**:
  1. TabBar コンポーネント内
  2. TabBar の外（独立ボタン）
- **Selected**: Option 1 — TabBar 内の右端
- **Rationale**: タブと同じ視覚コンテキスト、VS Code/ブラウザの慣習と一致

## Risks & Mitigations
- `tauri-plugin-dialog` の追加で capabilities 設定が必要 — Tauri v2 の capability 設定を正しく行う
- untitled タブの counter がセッション内でリセットされる — 閉じた番号を再利用せず常にインクリメント
