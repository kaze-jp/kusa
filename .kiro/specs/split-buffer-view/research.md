# Research & Design Decisions

---
**Feature**: `split-buffer-view`
**Discovery Scope**: Extension（既存システムの拡張）
**Key Findings**:
  - 既存 `SplitLayout` コンポーネントがそのまま再利用可能
  - `tabStore` はペインごとの独立バッファ管理に対応可能（既に `switchTab` / `openTab` がある）
  - 既存 `editMode` との排他制御が設計の中心課題
---

## Research Log

### 既存 SplitLayout の再利用性
- **Context**: バッファ分割表示のUI基盤として既存コンポーネントが使えるか
- **Findings**:
  - `SplitLayout.tsx` は汎用的な left/right props を受け取る設計
  - 50:50 デフォルト、200px 最小幅、ドラッグリサイズ対応
  - 現在は edit split（エディタ+プレビュー）のみで使用
  - そのまま再利用可能。left/right に Preview コンポーネントを渡すだけ
- **Implications**: 新コンポーネント不要。SplitLayout をそのまま使える

### タブストアとペイン管理の分離
- **Context**: 各ペインが独立したバッファを持つ場合、tabStore をどう拡張するか
- **Findings**:
  - 現在の tabStore は「1つのアクティブタブ」のみ管理
  - バッファ分割では「左ペイン用バッファID」「右ペイン用バッファID」が必要
  - tabStore 自体は変更不要。新しい `splitPaneStore` でペインとバッファの対応を管理
  - tabStore の `tabs()` リストをバッファ選択UIのソースとして利用
- **Implications**: tabStore は触らない。ペイン状態は新しいストアで管理

### editMode との排他制御
- **Context**: 既存の edit / split モードとバッファ分割が競合しないか
- **Findings**:
  - `editMode: "preview" | "edit" | "split"` が現在のモード
  - バッファ分割は `editMode === "preview"` 時のみ有効
  - edit/split モード中は `Ctrl-W v` を無視
  - バッファ分割中は `Ctrl+E` を無視
  - 独立した signal `bufferSplitActive` で管理し、editMode とは直交させる
- **Implications**: 排他制御は App.tsx のキーハンドラで実装。シンプルなガード条件

### キーバインド設計（Ctrl-W プレフィックス）
- **Context**: nvim の `Ctrl-W` プレフィックスをどう実装するか
- **Findings**:
  - nvim では `Ctrl-W` がウィンドウ操作のプレフィックスキー
  - ブラウザ / Tauri では `Ctrl-W` はタブ/ウィンドウを閉じるショートカット
  - → macOS では `Cmd-W`（タブ閉じ）とは別。`Ctrl-W` は空いている
  - 2ストローク入力: Ctrl-W → v/h/l/q の連続入力を検知
  - 実装: 最初の Ctrl-W で「待機状態」に入り、一定時間内の次キーで操作決定
- **Implications**: 2ストロークキーバインドの仕組みが必要。タイムアウト付き

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: editMode 拡張 | editMode に "buffer-split" を追加 | 既存フローに統合 | 状態の組み合わせ爆発、既存ロジック影響大 | 不採用 |
| B: 独立 signal | bufferSplitActive signal を新設 | 既存コード影響最小、テスト容易 | 排他制御を別途実装 | **採用** |
| C: layout manager | 汎用レイアウトマネージャ | 将来拡張性高い | 過剰設計、YAGNI | 不採用 |

## Design Decisions

### Decision: ペイン状態管理を独立 signal で実装
- **Context**: バッファ分割の状態をどこで管理するか
- **Alternatives Considered**:
  1. editMode を拡張 — 既存 edit/split ロジックへの影響大
  2. 独立 signal + 専用ストア — 最小影響、テスト容易
  3. 汎用レイアウトマネージャ — YAGNI
- **Selected Approach**: Option B — `createBufferSplitStore()` を新設
- **Rationale**: 既存の editMode / tabStore を変更せず、新機能をアドオンとして追加できる。SolidJS の fine-grained reactivity と相性良好
- **Trade-offs**: ペインとタブの同期ロジックが App.tsx に集中する

### Decision: 2ストロークキーバインド
- **Context**: `Ctrl-W v/h/l/q` の入力検知方法
- **Selected Approach**: Ctrl-W 押下で待機フラグを立て、500ms 以内の次キーで操作を決定。タイムアウトでキャンセル
- **Rationale**: シンプルで確実。vim の動作に近い。既存のキーハンドラに統合しやすい

## Risks & Mitigations
- **R1**: 2ストロークキーバインドの入力遅延 — 500ms タイムアウトで体感上問題なし
- **R2**: 両ペインで同じバッファを開いた場合の同期 — 同じバッファを許容し、独立スクロールとする（nvim と同じ動作）
- **R3**: ペイン状態と tabStore の不整合 — バッファ分割終了時に必ずクリーンアップ
