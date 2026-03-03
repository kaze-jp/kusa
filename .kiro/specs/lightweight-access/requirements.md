# Requirements Document

## Introduction
kusaの第3コア体験「Lightweight Access」の要件定義。ターミナルAI開発者が、Markdownを「ちょい見」したいときに**軽量なpopup/peekウィンドウ**で素早く内容を確認し、Escで即座に元の作業に戻れることをゴールとする。フルウィンドウを開くコストを払わず、表示の「重さ」を用途に応じて選べる体験を実現する。本featureは`instant-read`（基本ファイルプレビュー）の上に構築され、同specで提供されるPreviewコンポーネント、MarkdownPipeline、Appシェル、CLI引数解析、ウィンドウ状態管理を再利用・拡張する。

## Requirements

### Requirement 1: peekモード起動
**Objective:** ターミナルAI開発者として、CLIフラグでpeekモード（小型overlay/popupウィンドウ）を指定してMarkdownファイルを表示したい。ちょい見したいだけのときにフルウィンドウを開くコストを避けるため。

#### Acceptance Criteria
1. When ユーザーが `kusa --peek file.md` を実行した場合, kusa shall 小型のpeekウィンドウ（デフォルト600x400px）でMarkdownファイルをプレビュー表示する
2. When ユーザーが `kusa -p file.md` を実行した場合, kusa shall `--peek` と同様にpeekモードでプレビュー表示する（短縮フラグ）
3. The kusa shall peekウィンドウをタイトルバーなし（decorations: false）で表示する
4. The kusa shall peekウィンドウを常に最前面（always on top）で表示する
5. The kusa shall peekウィンドウにリサイズを許可するが、最小サイズ（300x200px）を下回らないよう制限する

### Requirement 2: peekモードの即時終了
**Objective:** ターミナルAI開発者として、peekウィンドウをEscキー一発で閉じてターミナルに即座に戻りたい。「読んで戻る」だけの体験を最小コストで完了するため。

#### Acceptance Criteria
1. When ユーザーがpeekモードでEscキーを押した場合, kusa shall peekウィンドウを即座に閉じる
2. When ユーザーがpeekモードで `q` キーを押した場合, kusa shall peekウィンドウを即座に閉じる（Escに加えた補助的終了手段）
3. When ユーザーがpeekモードでウィンドウ外をクリックした場合, kusa shall peekウィンドウを閉じる（フォーカス喪失による自動クローズ）
4. When peekウィンドウが閉じられた場合, kusa shall アプリケーションプロセスを終了する

### Requirement 3: フルウィンドウへの昇格
**Objective:** ターミナルAI開発者として、peekで内容を確認した後にじっくり読みたくなった場合、そのままフルウィンドウに切り替えたい。コンテンツを途切れさせずスムーズに閲覧モードを変更するため。

#### Acceptance Criteria
1. When ユーザーがpeekモードで `f` キーを押した場合, kusa shall 現在のpeekウィンドウをフルウィンドウサイズ（デフォルト1200x800px）に拡大し、タイトルバーを表示する
2. When peekウィンドウからフルウィンドウに昇格した場合, kusa shall 表示中のMarkdownコンテンツとスクロール位置を維持する
3. When peekウィンドウからフルウィンドウに昇格した場合, kusa shall always-on-top属性を解除する
4. When フルウィンドウに昇格した場合, kusa shall Escキーによる即時クローズ動作を無効化し、通常のウィンドウ操作（Cmd+W / :q）に切り替える
5. When フルウィンドウに昇格した場合, kusa shall ウィンドウ外クリックによる自動クローズ動作を無効化する

### Requirement 4: パイプ入力時のデフォルトpeekモード
**Objective:** ターミナルAI開発者として、パイプでMarkdownを流し込んだときはデフォルトでpeekモードになってほしい。パイプ入力は「ちょい見」目的であることが多いため。

#### Acceptance Criteria
1. When stdinにパイプデータが存在し、かつ `--peek` / `--no-peek` フラグが明示されていない場合, kusa shall peekモードをデフォルトとしてウィンドウを表示する
2. When stdinにパイプデータが存在し、かつ `--no-peek` フラグが指定された場合, kusa shall フルウィンドウモードで表示する
3. When ファイル引数で起動し、かつ `--peek` フラグが指定されていない場合, kusa shall フルウィンドウモード（従来動作）で表示する

### Requirement 5: フォーカス非奪取オプション
**Objective:** ターミナルAI開発者として、peekウィンドウがターミナルのフォーカスを奪わないオプションがほしい。コマンド入力中にMarkdownをチラ見したいとき、フォーカス移動のコストを避けるため。

#### Acceptance Criteria
1. When ユーザーが `kusa --peek --no-focus file.md` を実行した場合, kusa shall peekウィンドウをフォーカスを取得せずに表示する
2. While no-focusモードで表示中, kusa shall peekウィンドウを常に最前面に維持しつつ、キーボードフォーカスを元のウィンドウ（ターミナル等）に残す
3. While no-focusモードで表示中, kusa shall peekウィンドウのクリックでフォーカスを取得し、通常のpeekモード操作（Esc/q/fキー）を有効化する
4. If no-focusモードのpeekウィンドウが表示されている状態で新しいpeekリクエストが来た場合, kusa shall 既存のpeekウィンドウの内容を新しいコンテンツに差し替える

### Requirement 6: ウィンドウサイズプリセット
**Objective:** ターミナルAI開発者として、peekウィンドウやフルウィンドウのサイズをプリセットから選択したい。作業環境やディスプレイサイズに応じて最適な表示サイズを素早く適用するため。

#### Acceptance Criteria
1. The kusa shall 以下のウィンドウサイズプリセットを提供する: peek（600x400px）、full（1200x800px）、half（画面幅の50% x 画面高さの75%）
2. When ユーザーが `kusa --peek --size half file.md` を実行した場合, kusa shall halfプリセットのサイズでpeekウィンドウを表示する
3. The kusa shall ウィンドウプリセットの値をデフォルト設定として内蔵し、将来の設定ファイル対応に備えた構造とする
4. When peekモードでリサイズされたウィンドウサイズは, kusa shall 次回起動時に復元しない（peekは毎回プリセットサイズで起動する）

### Requirement 7: peekモードの視覚的区別
**Objective:** ターミナルAI開発者として、peekモードとフルウィンドウモードが視覚的に区別できてほしい。現在の表示モードを直感的に把握するため。

#### Acceptance Criteria
1. The kusa shall peekモード時にウィンドウの角を丸く表示する（border-radius適用）
2. The kusa shall peekモード時にウィンドウの下部に操作ヒントバー（Esc: 閉じる / f: フルウィンドウ / q: 閉じる）を表示する
3. While peekモードで表示中, kusa shall 操作ヒントバーを3秒後に自動的にフェードアウトし、マウスホバーまたはキー入力時に再表示する
4. The kusa shall peekウィンドウに微細なドロップシャドウを適用し、デスクトップ上でoverlay的な存在感を演出する
