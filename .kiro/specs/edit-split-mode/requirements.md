# Requirements Document

## Introduction

kusaのMVP仕様に含まれるEdit/Splitモードを再有効化する。プレビュー専用リファクタで UIルーティングから外された既存コンポーネント（EditorPane, SplitLayout, StatusBar, SyncEngine）をApp.tsxに再接続し、Vimキーバインドによるモード切替を実装する。ファイルを開いた状態でPreview↔Edit↔Splitの3モードをシームレスに切り替えられるようにする。

## Requirements

### Requirement 1: モード切替

**Objective:** ユーザーとして、Preview/Edit/Splitの3モードをキーボードで素早く切り替えたい。これにより、読む→書くの流れがシームレスになる。

#### Acceptance Criteria

1. While プレビューモードで表示中, when ユーザーが `i` キーを押す, kusa shall Editモードに切り替え、CodeMirrorエディタを表示する
2. While EditまたはSplitモードで表示中, when ユーザーが `Escape` キーをNORMALモードで押す, kusa shall Previewモードに戻る
3. While プレビューモードで表示中, when ユーザーが `Ctrl+e` を押す, kusa shall Splitモード（エディター左+プレビュー右）に切り替える
4. While EditまたはSplitモードで表示中, when ユーザーが `Ctrl+e` を押す, kusa shall Previewモードに戻る
5. While bufferモード（stdin/clipboard/URL）で表示中, kusa shall モード切替キーバインドを無効化し、読み取り専用を維持する
6. The kusa shall file-listモードおよびerrorモードではモード切替を無効化する

### Requirement 2: Editモード

**Objective:** ユーザーとして、CodeMirror 6のVimモードでMarkdownを編集したい。これにより、ターミナルネイティブな編集体験を得られる。

#### Acceptance Criteria

1. When Editモードに切り替わる, kusa shall CodeMirrorモジュールを遅延ロードし、エディタを表示する
2. While Editモードで表示中, kusa shall Vimキーバインド（NORMAL/INSERT/VISUAL/COMMAND）を有効にする
3. While Editモードで表示中, kusa shall 画面下部にStatusBarを表示し、Vimモード・カーソル位置・dirty状態を表示する
4. When エディタ内容が変更される, kusa shall 自動保存（800msデバウンス）を実行する
5. While Editモードで表示中, when ユーザーが `:w` コマンドを実行する, kusa shall ファイルを即座に保存する
6. While Editモードで表示中, when ユーザーが `:wq` コマンドを実行する, kusa shall ファイルを保存してPreviewモードに戻る
7. While Editモードで表示中, when ユーザーが `:q` コマンドを実行する, kusa shall Previewモードに戻る

### Requirement 3: Splitモード

**Objective:** ユーザーとして、エディターとプレビューを並列表示したい。これにより、編集結果をリアルタイムに確認できる。

#### Acceptance Criteria

1. When Splitモードに切り替わる, kusa shall SplitLayout（左:エディタ、右:プレビュー）をデフォルト50:50で表示する
2. While Splitモードで表示中, when ユーザーがディバイダーをドラッグする, kusa shall パネル幅を変更する（最小幅200px）
3. While Splitモードで表示中, when エディタ内容が変更される, kusa shall 250msデバウンスでプレビューを更新する
4. While Splitモードで表示中, kusa shall StatusBarを画面下部に表示する
5. While Splitモードで表示中, when エディタ内容が変更される, kusa shall 自動保存（800msデバウンス）を実行する

### Requirement 4: モード切替時の状態保持

**Objective:** ユーザーとして、モード切替時に編集状態とスクロール位置が維持されたい。これにより、モード切替のコストが低くなる。

#### Acceptance Criteria

1. When PreviewモードからEdit/Splitモードに切り替わる, kusa shall 現在のMarkdown内容をエディタに反映する
2. When Edit/SplitモードからPreviewモードに切り替わる, kusa shall エディタの最新内容でプレビューを更新する
3. When モード切替が発生する and 未保存の変更がある, kusa shall 切替前に自動保存を実行する
4. If CodeMirrorモジュールのロードに失敗する, kusa shall エラーメッセージを表示しPreviewモードを維持する

### Requirement 5: 既存機能との統合

**Objective:** ユーザーとして、Edit/Splitモードでもタブ・ファイル監視・ドラッグ&ドロップが正常に動作してほしい。

#### Acceptance Criteria

1. While Edit/Splitモードで表示中, when タブを切り替える, kusa shall 新しいタブの内容をエディタに反映する
2. While Edit/Splitモードで表示中, when ファイルが外部で変更される, kusa shall 変更を通知し、dirty状態でなければ自動リロードする
3. While Edit/Splitモードで表示中, when ファイルがドロップされる, kusa shall 新しいタブで開きPreviewモードで表示する
4. While Editモードで表示中, kusa shall Previewモードのキーボードショートカット（Cmd+W, Cmd+F, テーマ切替等）を維持する
