# Implementation Tasks

## Tasks

- [ ] 1. enterEditMode に isPeekMode ガードを追加
  - src/App.tsx の enterEditMode() 先頭に `if (isPeekMode()) return;` を追加
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. useVimNav の i キーハンドラに isPeekMode ガードを追加
  - src/lib/useVimNav.ts の i キー分岐に isPeekMode チェックを追加
  - isPeekMode を import する
  - _Requirements: 1.1, 2.1-2.6_

- [ ] 3. HintBar に vim ナビゲーションヒントを追加
  - src/components/HintBar.tsx に j/k スクロールヒントを追加
  - _Requirements: 3.1, 3.2_

- [ ] 4. ビルド検証
  - `bun run build` でビルド成功を確認
