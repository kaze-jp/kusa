# Research & Design Decisions

## Summary
- **Feature**: `edit-split-mode`
- **Discovery Scope**: Extension（既存コンポーネントの再有効化）
- **Key Findings**:
  - 全コンポーネント（EditorPane, SplitLayout, StatusBar, SyncEngine）は完全に動作可能な状態で存在
  - App.tsx の `AppViewMode` 型と Switch ルーティングに Edit/Split が欠落しているだけ
  - 新規ライブラリ追加は不要。既存の @codemirror/* と @replit/codemirror-vim で対応

## Research Log

### 既存コンポーネントの状態確認
- **Context**: Edit/Split モードのコードが UI から外されている範囲を特定
- **Findings**:
  - `EditorPane.tsx`: 完全に動作可能。CodeMirrorModules を受け取り CMEditor を生成
  - `SplitLayout.tsx`: 完全に動作可能。PointerEvent ベースのリサイズ、最小200px
  - `StatusBar.tsx`: 完全に動作可能。Vim モード表示、カーソル位置、dirty 表示、通知
  - `sync.ts`: 完全に動作可能。プレビューデバウンス250ms、自動保存800ms、write_file IPC
  - `editor.ts`: 完全に動作可能。遅延ローダー、Vim ex-commands (:w, :wq, :q)、jk escape
- **Implications**: 新規コンポーネント作成不要。App.tsx のルーティングと状態管理の変更のみ

### Vim キーバインドの競合分析
- **Context**: `i` キーと `Ctrl+e` のモード切替が既存キーバインドと競合しないか
- **Findings**:
  - `useVimNav.ts`: `i` キーはハンドルされていない（j/k/g/G/]/[ のみ）→ 競合なし
  - `App.tsx handleKeyDown`: `Ctrl+e` は未使用 → 競合なし
  - `Escape` キー: Preview モードでは未使用 → 競合なし
  - 既存ガード: INPUT/TEXTAREA/contentEditable 要素がフォーカスされている場合はスキップ → Edit モードの CodeMirror と共存可能
- **Implications**: 提案キーバインドは安全に追加可能

### モード状態管理アプローチ
- **Context**: AppViewMode にどうモードを追加するか
- **Findings**:
  - 現在の `AppViewMode` は UI のトップレベル状態（loading/demo/file-list/preview/buffer/error）
  - Edit/Split は preview のサブモード（ファイルが開いている前提）として扱うのが適切
  - 別の signal `editMode` を追加し、preview 表示時の内部モードとして管理する方が既存コードへの影響が少ない

## Design Decisions

### Decision: Edit/Split を AppViewMode のサブモードとして管理

- **Context**: Edit/Split モードを AppViewMode に追加するか、別 signal にするか
- **Alternatives Considered**:
  1. AppViewMode に "edit" | "split" を追加 — 既存の Switch 分岐を大幅改修
  2. 別 signal `editMode: "preview" | "edit" | "split"` を追加 — preview 表示内部で分岐
- **Selected Approach**: Option 2 — 別 signal
- **Rationale**:
  - AppViewMode はファイル/バッファ/エラーなどのトップレベル状態を管理。Edit/Split はファイルが開いている時のみ有効なサブモード
  - 既存の Switch ルーティングの変更を最小限に抑える
  - buffer/file-list/error モードとの干渉を自然に回避
- **Trade-offs**: signal が増えるが、責務が明確

### Decision: Escape キーによる Preview 復帰タイミング

- **Context**: CodeMirror Vim の Escape と、Preview 復帰の Escape をどう区別するか
- **Alternatives Considered**:
  1. Escape を2回連続で押す → Preview 復帰
  2. NORMAL モードで Escape → Preview 復帰（INSERT→NORMAL は CodeMirror が処理）
  3. 別キー（例: `q`）で復帰
- **Selected Approach**: Option 2 — NORMAL モードで Escape
- **Rationale**:
  - INSERT モードの Escape は CodeMirror Vim が NORMAL へ戻す
  - NORMAL モードの Escape は CodeMirror Vim では何もしない → フロントエンドでキャッチ可能
  - Vim ユーザーにとって自然な操作感
- **Trade-offs**: Vim mode polling (100ms interval) で NORMAL 判定の微小遅延あり

## Risks & Mitigations
- **CodeMirror 遅延ロード失敗**: ネットワーク不要（バンドル済み）、キャッシュ済みモジュール。エラー時は Preview 維持でフォールバック
- **モード状態の不整合**: signal の一元管理で防止。useVimNav は editMode signal を参照し、edit/split 時はナビゲーションを無効化
