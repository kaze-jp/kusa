# Requirements Document

## Introduction
nvimのウィンドウ分割モデルに基づき、kusaに左右バッファ分割表示機能を追加する。タブは1つのまま、2つの独立したプレビューペインで異なるMarkdownファイルを並べて表示できるようにする。現状のSplit mode（エディタ+プレビュー）とは別の概念として、バッファ比較やドキュメント参照を可能にする。

## Requirements

### Requirement 1: ウィンドウ分割
**Objective:** ユーザーとして、プレビューモードからウィンドウを左右に分割したい。異なるMarkdownファイルを並べて比較・参照できるようにするため。

#### Acceptance Criteria
1. When ユーザーがプレビューモードで `Ctrl-W v` を押す, kusa shall 現在のバッファを左ペインに保持したまま右ペインを開き、バッファ選択状態にする
2. While ウィンドウが分割されている状態, kusa shall 左右ペインの境界をドラッグでリサイズできるようにする
3. While ウィンドウが分割されている状態, kusa shall 各ペインが独立したスクロール位置を保持する
4. When ユーザーが `Ctrl-W q` を押す, kusa shall アクティブペインを閉じて単一ペイン表示に戻る

### Requirement 2: ペイン間フォーカス移動
**Objective:** ユーザーとして、左右のペイン間をキーボードで移動したい。マウスを使わず素早く参照先を切り替えるため。

#### Acceptance Criteria
1. When ユーザーが `Ctrl-W h` を押す, kusa shall 左ペインにフォーカスを移動する
2. When ユーザーが `Ctrl-W l` を押す, kusa shall 右ペインにフォーカスを移動する
3. While ペインがフォーカスされている状態, kusa shall フォーカスされたペインの上部にアクティブインジケーター（ハイライト）を表示する
4. When ユーザーがペインをクリックする, kusa shall クリックされたペインにフォーカスを移動する

### Requirement 3: ペインへのバッファ割り当て
**Objective:** ユーザーとして、各ペインに表示するバッファ（ファイル）を選択したい。比較したいファイルを自由に割り当てるため。

#### Acceptance Criteria
1. When 右ペインが開かれた直後, kusa shall 既存のバッファリストを表示し、ユーザーにバッファを選択させる
2. When ユーザーがフォーカスされたペインでタブ切り替え操作（`Shift+H` / `Shift+L`）を行う, kusa shall そのペインのバッファのみを切り替える
3. While ウィンドウが分割されている状態, kusa shall 各ペインに表示中のファイル名をペイン上部に表示する
4. The タブバー shall 現在のアクティブペインのバッファをハイライト表示する

### Requirement 4: 分割表示との共存
**Objective:** ユーザーとして、既存のSplit mode（エディタ+プレビュー）と新しいバッファ分割が競合しないようにしたい。混乱なく使い分けるため。

#### Acceptance Criteria
1. While バッファ分割表示中, kusa shall `Ctrl+E`（エディタモード切替）を無効化し、プレビュー専用モードとする
2. When ユーザーがバッファ分割を閉じる, kusa shall 元の単一プレビューモードに戻り、Split mode（Ctrl+E）が再び利用可能になる
3. While エディタモードまたはSplit mode中, kusa shall `Ctrl-W v`（バッファ分割）を無効化する

### Requirement 5: レイアウトと表示品質
**Objective:** ユーザーとして、分割表示が美しく読みやすいものであってほしい。長時間のドキュメントレビューでも快適に使えるようにするため。

#### Acceptance Criteria
1. The 各ペイン shall 最小幅200pxを維持し、それ以下にリサイズできないようにする
2. The 分割レイアウト shall 初期状態で50:50の均等分割とする
3. While ウィンドウが分割されている状態, kusa shall 左右ペインの間に視覚的な区切り線（ディバイダー）を表示する
4. The 各ペイン shall 独立したMarkdownプレビューとして、フルレンダリング（GFM、シンタックスハイライト、目次等）を提供する
