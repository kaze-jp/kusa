# Design: Split Mode Scroll Sync

## Architecture Overview

```
CodeMirror (Editor)                    Preview (HTML)
┌──────────────────┐                  ┌──────────────────┐
│ カーソル移動      │                  │ data-source-line │
│  → onCursorChange│─── ScrollSync ──→│  属性付きDOM     │
│    {line, col}   │    module        │  → scrollIntoView│
└──────────────────┘                  └──────────────────┘
```

3つのモジュールで構成:
1. **rehype-source-lines** — Markdownパイプラインにソース行番号を付与
2. **scrollSync** — カーソル位置からプレビュースクロールを制御
3. **SplitContent統合** — App.tsxでの配線

## Module 1: rehype-source-lines (rehype plugin)

### 概要

rehypeプラグインとして実装。hAST（HTML AST）のブロックレベル要素に `data-source-line` 属性を付与する。

### ファイル: `src/lib/rehype-source-lines.ts`

```typescript
import type { Root, Element } from "hast";
import type { Plugin } from "unified";

const BLOCK_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li",
  "pre", "blockquote", "table",
  "hr", "div",
]);

const rehypeSourceLines: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (
        BLOCK_TAGS.has(node.tagName) &&
        node.position?.start?.line
      ) {
        node.properties = node.properties || {};
        node.properties["dataSourceLine"] = node.position.start.line;
      }
    });
  };
};
```

### rehype-sanitize との統合

`markdown.ts` の `sanitizeSchema` に `data-source-line` を追加:

```typescript
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "dataSourceLine"],
  },
};
```

### パイプライン挿入位置

```
remarkParse → remarkGfm → remarkRehype
→ rehypePrettyCode → rehypeSlug
→ rehypeSourceLines          ← ここに挿入（sanitize の前）
→ rehypeExternalLinks → rehypeSanitize → rehypeStringify
```

**重要**: `rehypeSanitize` の前に配置しないと属性が除去される。

## Module 2: scrollSync (スクロール同期モジュール)

### ファイル: `src/lib/scroll-sync.ts`

```typescript
export interface ScrollSyncConfig {
  getPreviewContainer: () => HTMLElement | null;
  debounceMs?: number;  // default: 80
}

export interface ScrollSyncInstance {
  /** エディタのカーソル行が変わったら呼ぶ */
  syncToLine(line: number): void;
  /** プレビューのスクロール位置から対応するソース行を取得 */
  getLineFromScroll(): number | null;
  /** 手動スクロール中フラグ管理 */
  notifyManualScroll(): void;
  destroy(): void;
}
```

### 同期アルゴリズム

1. `syncToLine(line)` が呼ばれる
2. プレビューコンテナ内で `[data-source-line]` を全取得
3. `line` 以下で最も近い `data-source-line` を持つ要素を二分探索
4. 該当要素を `scrollIntoView({ behavior: "smooth", block: "center" })` で表示

### 手動スクロール抑制

```
ユーザーがプレビューをスクロール
  → notifyManualScroll() → isManualScrolling = true
  → 3秒タイマー開始
  → タイマー満了 → isManualScrolling = false
  → syncToLine() 内で isManualScrolling なら skip
```

### getLineFromScroll() (初回同期用)

Split mode突入時、プレビューの現在表示位置からエディタのカーソルを設定:

1. プレビューコンテナの `scrollTop` を取得
2. `data-source-line` 付き要素を走査
3. 表示領域上端に最も近い要素の `data-source-line` を返す
4. エディタ側で該当行にカーソルを移動

## Module 3: SplitContent統合 (App.tsx)

### 変更箇所

1. **Preview ref の取得**: `SplitContent` 内のPreviewにrefを渡す
2. **ScrollSync の初期化**: `SplitContent` マウント時にインスタンス作成
3. **onCursorChange フック**: カーソル変更時に `syncToLine()` を呼ぶ
4. **初回同期**: エディタReady時に `getLineFromScroll()` → カーソル移動
5. **手動スクロール検知**: Preview の `onScroll` で `notifyManualScroll()`

### データフロー

```
Split mode 突入
  → SplitContent マウント
  → Preview ref 取得
  → ScrollSync 初期化
  → エディタ Ready
  → getLineFromScroll() → エディタカーソル移動（初回同期）

カーソル移動
  → onCursorChange({line, col})
  → scrollSync.syncToLine(line)
  → プレビュー自動スクロール

プレビュー手動スクロール
  → Preview.onScroll
  → scrollSync.notifyManualScroll()
  → 3秒間自動同期停止
```

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/rehype-source-lines.ts` | 新規: rehypeプラグイン |
| `src/lib/scroll-sync.ts` | 新規: スクロール同期モジュール |
| `src/lib/markdown.ts` | パイプラインにrehype-source-lines追加、sanitizeスキーマ更新 |
| `src/App.tsx` | SplitContent内にScrollSync統合、Preview refの受け渡し |
| `src/components/Preview.tsx` | 変更なし（既にref/onScrollをサポート） |

## 技術的リスクと対策

### リスク1: rehype-sanitize がdata属性を除去する
**対策**: sanitizeSchema に `dataSourceLine` をホワイトリスト追加

### リスク2: rehype-pretty-code が position 情報を消す
**対策**: rehype-source-lines を rehype-pretty-code の後に配置。pretty-code は `<pre>` 要素にpositionを保持する可能性があるため、要検証。

### リスク3: 大量のDOM要素でパフォーマンス劣化
**対策**: 二分探索で対象要素を効率的に特定。debounce (80ms) で呼び出し頻度を制限。

### リスク4: remarkRehype が position を preserveしない
**対策**: `remarkRehype` はデフォルトでpositionを保持する。ただし一部の変換（テーブルセルなど）ではpositionが消えることがある。主要なブロック要素（h1-h6, p, pre, ul, ol）では問題ない。
