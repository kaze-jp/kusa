# Requirements Document

## Introduction
kusaの第二のコア体験「Inline Edit」の要件定義。ターミナルAI開発者（Claude Code + Ghostty等）が、プレビュー表示を維持しながらVimキーバインドでMarkdownを編集できる体験を実現する。Notionのインライン編集の直感性とVimの操作性を融合し、モード切替の煩わしさを排除する。`instant-read` の Preview / MarkdownPipeline / App シェルを拡張して構築する。

## Requirements

### Requirement 1: Split View
**Objective:** ターミナルAI開発者として、エディタとプレビューを横並びで表示したい。編集内容をリアルタイムに確認しながらMarkdownを書くため。

#### Acceptance Criteria
1. When ユーザーが Split view モードに切り替えた場合, kusa shall エディタを左ペイン、プレビューを右ペインとして横並びで表示する
2. The kusa shall ペイン間のディバイダーをドラッグしてペイン幅を変更できるリサイザーを提供する
3. While Split view が表示されている間, kusa shall エディタの編集内容をリアルタイムでプレビューに反映する
4. When ユーザーがウィンドウサイズを変更した場合, kusa shall ペイン比率を維持したままレイアウトを調整する
5. The kusa shall ペイン比率のデフォルトを 50:50 とする

### Requirement 2: CodeMirror エディタ
**Objective:** ターミナルAI開発者として、高機能なテキストエディタでMarkdownを編集したい。シンタックスハイライトや行番号のある快適な編集環境を得るため。

#### Acceptance Criteria
1. When エディタが初期化された場合, kusa shall CodeMirror 6 でMarkdownファイルの内容を表示する
2. The kusa shall Markdownシンタックスハイライトをエディタに適用する
3. The kusa shall 行番号を表示する
4. The kusa shall ダークテーマをエディタに適用する
5. While エディタが表示されている間, kusa shall カーソル位置（行:列）をステータス領域に表示する

### Requirement 3: Vim キーバインド
**Objective:** ターミナルAI開発者として、Vimのキーバインドでエディタを操作したい。ターミナルと同じ操作感で編集するため。

#### Acceptance Criteria
1. The kusa shall CodeMirror vim extension によるVimキーバインドをデフォルトで有効にする
2. While ノーマルモードの間, kusa shall Vim motions（`w`, `b`, `e`, `0`, `$`, `gg`, `G` 等）でカーソルを移動できる
3. When ユーザーが `i`, `a`, `o`, `A`, `O` を入力した場合, kusa shall インサートモードに切り替わる
4. When ユーザーがインサートモード中に `jk` を入力した場合, kusa shall ノーマルモードに切り替わる
5. While ノーマルモードの間, kusa shall テキスト操作（`dd`, `yy`, `p`, `x`, `cw` 等）を実行できる
6. While ノーマルモードの間, kusa shall Vimモード（NORMAL / INSERT / VISUAL）をステータス領域に表示する
7. When ユーザーが `:q` を入力した場合, kusa shall ウィンドウを閉じる

### Requirement 4: ファイル保存
**Objective:** ターミナルAI開発者として、編集内容をファイルに保存したい。Vimの `:w` コマンドと自動保存の両方で安全にファイルを書き戻すため。

#### Acceptance Criteria
1. When ユーザーが `:w` を入力した場合, kusa shall 編集内容を元のファイルパスに即座に保存する
2. When ユーザーが `:wq` を入力した場合, kusa shall ファイルを保存し、ウィンドウを閉じる
3. While エディタで編集が行われている間, kusa shall 最後の変更から一定時間（500ms-1s）経過後に自動保存する
4. When ファイルの保存が完了した場合, kusa shall 保存成功を示す通知をステータス領域に一時的に表示する
5. If ファイルの保存に失敗した場合, kusa shall エラー内容を表示し、編集内容を破棄しない
6. While 未保存の変更がある間, kusa shall タイトルバーまたはステータス領域に未保存インジケーターを表示する

### Requirement 5: 表示モード切替
**Objective:** ターミナルAI開発者として、Preview / Edit / Split の3モードを切り替えたい。状況に応じて最適な表示で作業するため。

#### Acceptance Criteria
1. The kusa shall Preview（プレビューのみ）、Edit（エディタのみ）、Split（左エディタ + 右プレビュー）の3つの表示モードを提供する
2. When ユーザーがキーボードショートカットを入力した場合, kusa shall 表示モードを切り替える
3. When ファイルを CLI から開いた場合, kusa shall デフォルトで Preview モードで表示する
4. While Preview モードで表示中にユーザーが `Enter` または `i` を押した場合, kusa shall Split モードに切り替わりエディタにフォーカスする
5. When ユーザーが `Escape` を2回押した場合, kusa shall Preview モードに戻る

### Requirement 6: エディタの遅延ロード
**Objective:** ターミナルAI開発者として、エディタを使わないときは起動速度を犠牲にしたくない。プレビューのみの場合は instant-read の高速起動を維持するため。

#### Acceptance Criteria
1. When Preview モードで起動した場合, kusa shall CodeMirror のモジュールをロードしない
2. When ユーザーが初めて Edit または Split モードに切り替えた場合, kusa shall CodeMirror のモジュールを非同期でロードする
3. While CodeMirror のロード中, kusa shall ローディングインジケーターを表示する
4. The kusa shall CodeMirror モジュールのロード完了後、再ロードなしで即座にモード切替できる

### Requirement 7: リアルタイムプレビュー同期
**Objective:** ターミナルAI開発者として、エディタの編集がプレビューに即座に反映されてほしい。編集結果を視覚的に確認しながら作業するため。

#### Acceptance Criteria
1. While Split view で編集中, kusa shall エディタの変更をデバウンス（200-300ms）してプレビューに反映する
2. While プレビュー更新中, kusa shall 前回のプレビュー表示を維持し、ちらつきを防止する
3. When Markdownのパースに失敗した場合, kusa shall 最後に成功したプレビューを維持し、エラー行をハイライトする
