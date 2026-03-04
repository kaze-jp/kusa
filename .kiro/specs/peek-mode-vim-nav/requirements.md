# Requirements Document

## Introduction
peekモードでのvimナビゲーション対応と、editモード進入ガード。peekモードは読み取り専用のプレビュー体験だが、j/k, Ctrl+D/U等のvimスクロールナビゲーションが利用できず、また`i`キー押下でeditモードに入ろうとしてvim navが壊れるバグがある。

## Requirements

### Requirement 1: peekモードでのeditモード進入ガード
**Objective:** peekモードで`i`キーを押してもeditモードに入らないようにしたい。誤ってCodeMirrorがロードされ、vim navが壊れるのを防ぐため。

#### Acceptance Criteria
1. When ユーザーがpeekモードで`i`キーを押した場合, kusa shall editモードへの遷移を行わず、現在のプレビュー表示を維持する
2. When ユーザーがpeekモードで`i`キーを押した場合, kusa shall CodeMirrorの遅延ロードを開始しない
3. When ユーザーがフルモードで`i`キーを押した場合, kusa shall 従来通りeditモードに遷移する（既存動作の維持）

### Requirement 2: peekモードでのvimナビゲーション動作保証
**Objective:** peekモードでj/k, Ctrl+D/U, gg, G等のvimスクロールナビゲーションが正しく動作することを保証したい。

#### Acceptance Criteria
1. When ユーザーがpeekモードで`j`キーを押した場合, kusa shall プレビューを下方向にスクロールする
2. When ユーザーがpeekモードで`k`キーを押した場合, kusa shall プレビューを上方向にスクロールする
3. When ユーザーがpeekモードでCtrl+Dを押した場合, kusa shall プレビューを半ページ下にスクロールする
4. When ユーザーがpeekモードでCtrl+Uを押した場合, kusa shall プレビューを半ページ上にスクロールする
5. When ユーザーがpeekモードで`gg`を入力した場合, kusa shall プレビューを先頭にスクロールする
6. When ユーザーがpeekモードで`G`を押した場合, kusa shall プレビューを末尾にスクロールする

### Requirement 3: HintBarにvimナビゲーションヒントを表示
**Objective:** peekモードのHintBarにvimナビゲーションキーの存在を示したい。ユーザーがj/k等のナビゲーションが使えることを直感的に把握するため。

#### Acceptance Criteria
1. The kusa shall peekモードのHintBarに`j/k`スクロールヒントを表示する
2. The kusa shall 既存のヒント（Esc, f, q）と新しいヒントを視覚的に区別して並べる
