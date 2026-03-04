# Research & Design Decisions

---

## Summary
- **Feature**: `instant-read`
- **Discovery Scope**: New Feature (greenfield)
- **Key Findings**:
  - Tauri v2 (v2.10.x) は SolidJS テンプレートを公式サポート、CLI/D&D/ファイル関連付け/単一インスタンス/ウィンドウ状態の全てに公式プラグインが存在
  - unified/remark エコシステムで GFM + シンタックスハイライトのパイプラインが確立済み
  - Tauri v2 + SolidJS の組み合わせで 100-150ms の cold start が現実的

## Research Log

### Tauri v2 プロジェクトセットアップ
- **Context**: 新規プロジェクトのスキャフォルド方法
- **Sources**: Tauri 公式ドキュメント、create-tauri-app
- **Findings**:
  - `bun create tauri-app my-app --template solid-ts` で SolidJS + TypeScript テンプレート生成
  - Tauri v2.10.2 (2025年2月) が最新安定版
  - CLI引数は `tauri-plugin-cli` で処理、`tauri.conf.json` の `plugins.cli` で定義
- **Implications**: CLI引数処理は Rust プラグイン経由、フロントエンドに `getMatches()` で渡す

### ファイル関連付け (.md)
- **Context**: macOS で .md ファイルをダブルクリックで kusa を起動
- **Sources**: Tauri 公式ドキュメント、Info.plist 生成
- **Findings**:
  - `bundle.fileAssociations` で ext, name, mimeType, role を設定
  - macOS では `CFBundleDocumentTypes` が自動生成される
  - `RunEvent::Opened { urls }` でファイルパスを受信
- **Implications**: Rust の `on_event` でファイルオープンイベントをハンドルし、フロントエンドに emit

### ドラッグ&ドロップ
- **Context**: ファイルマネージャから MD ファイルを D&D で開く
- **Sources**: Tauri v2 WebView API
- **Findings**:
  - HTML5 D&D は Tauri WebView では外部ファイルに非対応、Tauri 独自イベントを使用
  - `getCurrentWebview().onDragDropEvent()` で `over`/`drop`/`cancel` を受信
  - `event.payload.paths` でファイルパス配列を取得
- **Implications**: フロントエンド側でドロップゾーン UI + Tauri イベントリスナーを実装

### 単一インスタンス
- **Context**: 2回目の `kusa file.md` 実行時に既存ウィンドウを再利用
- **Sources**: tauri-plugin-single-instance
- **Findings**:
  - Rust-only プラグイン、最初に登録が必要
  - コールバックで `args` と `cwd` を受信、既存ウィンドウにフォーカス + ファイルパスを emit
- **Implications**: フロントエンドは `open-file` イベントをリッスンして表示を切り替え

### ウィンドウ状態永続化
- **Context**: ウィンドウサイズ・位置を記憶し復元
- **Sources**: tauri-plugin-window-state
- **Findings**:
  - プラグイン登録だけで自動保存・復元が有効
  - `"visible": false` 設定 + プラグインで復元後に表示で flicker 防止
  - `StateFlags` でサイズ/位置/最大化状態を選択的に永続化
- **Implications**: 設定最小限で要件を満たせる

### Markdown レンダリングパイプライン
- **Context**: GFM + シンタックスハイライトの実現
- **Sources**: unified/remark/rehype エコシステム
- **Findings**:
  - パイプライン: `remark-parse → remark-gfm → remark-rehype → rehype-pretty-code → rehype-stringify`
  - rehype-pretty-code は Shiki ベースで VS Code テーマを使用可能
  - 代替: rehype-highlight (highlight.js) はバンドル小さいが精度低い
- **Implications**: 初期は rehype-pretty-code + Shiki (github-dark テーマ) を採用。バンドルサイズ問題が出たら rehype-highlight にフォールバック

### 起動パフォーマンス
- **Context**: 200ms 以内の起動目標
- **Sources**: Tauri 公式ドキュメント、コミュニティ事例
- **Findings**:
  - Tauri v2 + SolidJS で 100-150ms cold start が現実的
  - Hidden window pattern で視覚的な起動遅延を解消
  - CodeMirror は遅延ロード（プレビュー表示に不要）
  - Rust 側で MD パースを先行開始し WebView 初期化と並行
- **Implications**: 初期描画はプレビューのみ、エディタは後続フェーズで遅延ロード

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Rust MD Parser | Rust 側で pulldown-cmark 等を使い HTML を生成 | 高速、メモリ効率 | IPC オーバーヘッド、フロントエンド制御が困難 | v0.1 では不採用 |
| Frontend MD Pipeline | unified/remark でフロントエンドが全て処理 | 柔軟、エコシステム豊富、インタラクティブ操作と統合容易 | 大ファイルで遅い可能性 | 採用 |
| Hybrid | Rust で高速パース、フロントエンドでレンダリング | バランス | 複雑度高い | 将来検討 |

## Design Decisions

### Decision: Markdown処理をフロントエンドに寄せる
- **Context**: CLAUDE.md の方針「Rust 側は最小限」に準拠
- **Alternatives Considered**:
  1. Rust (pulldown-cmark) でパース → HTML をフロントエンドに送信
  2. フロントエンド (unified/remark) で全処理
- **Selected Approach**: フロントエンド (unified/remark)
- **Rationale**: エコシステムが豊富、将来のインライン編集との統合が容易、Rust は最小限方針に合致
- **Trade-offs**: 大ファイルではパフォーマンス劣化の可能性あり（1MB+ で非同期処理で対応）
- **Follow-up**: 1MB 超ファイルでのパフォーマンステスト

### Decision: Shiki によるシンタックスハイライト
- **Context**: VS Code 同等のハイライト品質が要件
- **Alternatives Considered**:
  1. rehype-pretty-code (Shiki) — VS Code テーマ使用、高精度
  2. rehype-highlight (highlight.js) — 軽量、37言語組み込み
- **Selected Approach**: rehype-pretty-code (Shiki)
- **Rationale**: VS Code 同等品質の要件に直結。github-dark テーマで美しい表示
- **Trade-offs**: バンドルサイズが大きい（Shiki + WASM）、初回ロードが遅い可能性
- **Follow-up**: 遅延ロードでバンドルサイズ影響を軽減

### Decision: Hidden Window Pattern + 遅延 UI 初期化
- **Context**: 200ms 以内の起動速度目標
- **Selected Approach**: ウィンドウを非表示で起動 → MD レンダリング完了後に表示。CodeMirror は遅延ロード
- **Rationale**: 体感速度の最適化。v0.1 はプレビューのみなので CodeMirror 不要
- **Trade-offs**: 非表示→表示の切替ロジックが必要

## Risks & Mitigations
- Shiki WASM バンドルサイズ → 遅延ロード + 言語サブセットで軽減
- 大ファイル (1MB+) のフロントエンドパース遅延 → チャンク分割 + プログレッシブレンダリング
- Tauri WebView での HTML5 D&D 非対応 → Tauri 独自 API で対応（調査済み）

## References
- [Tauri v2 公式ドキュメント](https://v2.tauri.app/) — プラグイン、設定、API
- [unified/remark エコシステム](https://unifiedjs.com/) — MD パイプライン
- [rehype-pretty-code](https://rehype-pretty.pages.dev/) — Shiki ベースハイライト
- [Shiki](https://shiki.style/) — VS Code テーマ対応ハイライター
