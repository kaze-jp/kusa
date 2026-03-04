# Technical Design

## Overview
peekモードでのvim navガードとHintBar改善。変更箇所は3ファイルのみ。

## Changes

### 1. `src/App.tsx` — enterEditMode ガード
`enterEditMode()` の先頭に `isPeekMode()` チェックを追加。peekモードではeditモードに入れないようにする。

### 2. `src/lib/useVimNav.ts` — onEnterEdit ガード
`i` キーハンドラで `isPeekMode()` チェックを追加。peekモードでは `onEnterEdit` コールバックを呼ばない。
二重ガード（App側 + useVimNav側）で安全性を確保。

### 3. `src/components/HintBar.tsx` — vim navヒント追加
ヒントに `j/k` スクロールを追加。既存のヒント（Esc, f, q）の前にナビゲーション系ヒントを配置。

## Testing Strategy
- `enterEditMode` に isPeekMode ガードがあることの確認
- useVimNav の `i` キーで isPeekMode チェックがあることの確認
- HintBar に j/k ヒントが含まれることの確認
- ビルド成功の確認
