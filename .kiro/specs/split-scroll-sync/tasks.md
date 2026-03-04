# Tasks: Split Mode Scroll Sync

## Task 1: rehype-source-lines プラグイン作成
- [ ] `src/lib/rehype-source-lines.ts` を作成
  - hAST走査でブロック要素に `data-source-line` 属性を付与
  - 対象タグ: h1-h6, p, ul, ol, li, pre, blockquote, table, hr, div
- [ ] `src/lib/markdown.ts` のパイプラインに挿入 (rehypeSanitize の前)
- [ ] `sanitizeSchema` に `dataSourceLine` をホワイトリスト追加
- [ ] 動作確認: レンダリングされたHTMLに `data-source-line` が付いていること

## Task 2: scroll-sync モジュール作成
- [ ] `src/lib/scroll-sync.ts` を作成
  - `syncToLine(line)`: カーソル行 → プレビュー要素スクロール
  - `getLineFromScroll()`: プレビュースクロール位置 → ソース行番号
  - `notifyManualScroll()`: 手動スクロール抑制
  - `destroy()`: クリーンアップ
- [ ] 二分探索で効率的な要素特定
- [ ] debounce (80ms) でスクロール頻度制御
- [ ] 手動スクロール時の3秒自動同期停止

## Task 3: SplitContent への統合
- [ ] `SplitContent` 内でPreviewのDOM refを取得
- [ ] ScrollSync インスタンスの初期化・破棄
- [ ] `onCursorChange` → `scrollSync.syncToLine()` の接続
- [ ] Preview `onScroll` → `scrollSync.notifyManualScroll()` の接続
- [ ] エディタReady時の初回同期 (`getLineFromScroll()` → カーソル移動)

## Task 4: テスト・動作確認
- [ ] Split modeでカーソル移動時にプレビューが追従すること
- [ ] Split mode突入時にプレビュー位置がエディタに反映されること
- [ ] プレビュー手動スクロール時に自動同期が一時停止すること
- [ ] Preview mode / Edit mode への影響がないこと
- [ ] 大きなMarkdownファイルでパフォーマンスに問題がないこと
