# Research & Design Decisions

## Summary
- **Feature**: `fix-toc-active-heading`
- **Discovery Scope**: Extension（既存 hook の内部実装置き換え）
- **Key Findings**:
  - 変更対象は `src/lib/useActiveHeading.ts` のみ（公開 API 維持）
  - `activeId` signal は App.tsx, useFocusMode, useVimNav, TOCPanel で消費
  - 公開インターフェース `{ activeId, observe, disconnect }` は変更不要

## Research Log

### IntersectionObserver の既知問題
- **Context**: 現在の実装が常に最後の見出しをハイライトするバグ
- **Findings**:
  - `visibleHeadings` Map に保存される `boundingClientRect` はコールバック時点のスナップショットで古くなる
  - `rootMargin: "0px 0px -70% 0px"` でコンテナ上部30%しか監視しないため、見出し間の長いコンテンツではコールバックが発火しない区間が生じる
  - フォールバックロジック（lines 53-66）は Observer コールバック内でしか実行されず、スクロール全体をカバーしない
- **Implications**: IntersectionObserver を完全に廃止し、scroll イベントベースに置き換える

### 依存関係の影響分析
- **Context**: 公開 API 変更の影響範囲
- **Findings**:
  - `activeId: Accessor<string | null>` — useFocusMode, useVimNav, TOCPanel が消費
  - `observe(container: HTMLElement): void` — App.tsx の createEffect から呼び出し
  - `disconnect(): void` — onCleanup 経由で自動呼び出し
- **Implications**: 公開インターフェースは同一のため、消費側のコード変更は不要

## Design Decisions

### Decision: scroll + getBoundingClientRect に置き換え
- **Context**: IntersectionObserver が不安定で最後の見出しに固定されるバグ
- **Alternatives Considered**:
  1. IntersectionObserver のパラメータ調整（rootMargin, threshold）
  2. scroll イベント + getBoundingClientRect による完全置き換え
- **Selected Approach**: Option 2 — scroll + getBoundingClientRect
- **Rationale**:
  - スクロール毎に全見出しの位置を評価するため、見出し間の長いコンテンツでも漏れなく追跡可能
  - ロジックが単純で予測可能（コールバックのタイミングや Map の状態管理が不要）
  - rAF スロットリングで十分なパフォーマンスを確保
- **Trade-offs**: IntersectionObserver より CPU 使用率がわずかに高い可能性があるが、見出し数は通常少なく（< 50）影響は無視できる

## Risks & Mitigations
- `getBoundingClientRect` の頻繁な呼び出し → rAF スロットリングで1フレーム最大1回に制限
- コンテンツ変更時の見出し要素の不一致 → `observe()` 再呼び出しで毎回 querySelectorAll を実行
