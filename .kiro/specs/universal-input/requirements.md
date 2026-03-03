# Requirements Document

## Introduction
kusaの第2コア体験「Universal Input」の要件定義。ターミナルAI開発者が、ローカルファイルに限らず**あらゆるソースのMarkdown**を即座にプレビューできることをゴールとする。パイプ入力、クリップボード、GitHub上のファイルなど、ファイルとして手元に存在しないMarkdownコンテンツを気軽に美しく表示する体験を実現する。本featureは`instant-read`（基本ファイルプレビュー）の上に構築され、同specで提供されるPreviewコンポーネント、MarkdownPipeline、Appシェルを再利用する。

## Requirements

### Requirement 1: stdin パイプ入力
**Objective:** ターミナルAI開発者として、パイプで流し込んだMarkdownテキストをkusaでプレビュー表示したい。コマンド出力やファイル加工結果をファイルに保存せず即座にプレビューするため。

#### Acceptance Criteria
1. When ユーザーが `echo "# hello" | kusa` を実行した場合, kusa shall パイプから受信したMarkdownテキストをプレビュー表示するウィンドウを起動する
2. When ユーザーが `cat README.md | kusa` を実行した場合, kusa shall stdin経由で受信した内容をプレビュー表示する
3. When ユーザーが `gh pr view 123 --json body -q .body | kusa` を実行した場合, kusa shall GitHub CLIの出力をMarkdownとしてプレビュー表示する
4. The kusa shall stdinからの入力を一時バッファとして保持し、ファイルとして保存しない
5. When stdin入力でプレビュー表示中, kusa shall タイトルバーに "(stdin)" とソース情報を表示する
6. If stdinが空の場合, kusa shall 通常のファイル一覧表示（引数なし起動と同じ動作）にフォールバックする

### Requirement 2: クリップボード読み取り
**Objective:** ターミナルAI開発者として、クリップボードにコピーしたMarkdownテキストをkusaで即座にプレビュー表示したい。Webページやエディタからコピーした内容をファイルに保存せず確認するため。

#### Acceptance Criteria
1. When ユーザーが `kusa --clipboard` を実行した場合, kusa shall システムクリップボードのテキスト内容を取得しMarkdownとしてプレビュー表示する
2. When ユーザーが `kusa -c` を実行した場合, kusa shall `--clipboard` と同様にクリップボードの内容をプレビュー表示する（短縮フラグ）
3. When クリップボード入力でプレビュー表示中, kusa shall タイトルバーに "(clipboard)" とソース情報を表示する
4. If クリップボードにテキストが存在しない場合, kusa shall 「クリップボードにテキストが見つかりません」というエラーメッセージを表示する
5. The kusa shall クリップボードから取得した内容を一時バッファとして保持し、ファイルとして保存しない

### Requirement 3: GitHub shorthand からの取得
**Objective:** ターミナルAI開発者として、GitHub上のMarkdownファイルをURL入力やshorthand記法で直接取得・プレビューしたい。リポジトリのREADMEや設計ドキュメントをローカルにcloneせず確認するため。

#### Acceptance Criteria
1. When ユーザーが `kusa gh:owner/repo/path/to/file.md` を実行した場合, kusa shall GitHub APIからファイル内容を取得しMarkdownとしてプレビュー表示する
2. When ユーザーが `kusa gh:owner/repo` を実行した場合（パスなし）, kusa shall そのリポジトリの README.md を取得し表示する
3. When ユーザーが `kusa https://github.com/owner/repo/blob/main/file.md` を実行した場合, kusa shall URLからファイルを取得しプレビュー表示する
4. When GitHub shorthandでプレビュー表示中, kusa shall タイトルバーにソース情報（例: "gh:owner/repo/file.md"）を表示する
5. If ネットワークエラーまたは404が発生した場合, kusa shall 原因を含むエラーメッセージ（接続エラー、リポジトリ/ファイル未発見等）を表示する
6. If GitHub APIレート制限に到達した場合, kusa shall レート制限エラーメッセージと待ち時間の目安を表示する
7. The kusa shall 取得した内容を一時バッファとして保持し、ファイルとして保存しない

### Requirement 4: URL からの取得
**Objective:** ターミナルAI開発者として、任意のURLにあるMarkdownファイルを直接取得・プレビューしたい。GitHub以外のホスティングサービスやraw URLからもMarkdownを確認するため。

#### Acceptance Criteria
1. When ユーザーが `kusa https://raw.githubusercontent.com/owner/repo/main/file.md` を実行した場合, kusa shall URLからMarkdownを取得しプレビュー表示する
2. When ユーザーが `kusa https://example.com/document.md` を実行した場合, kusa shall URLからMarkdownを取得しプレビュー表示する
3. When URL入力でプレビュー表示中, kusa shall タイトルバーにURL情報を表示する
4. If ネットワークエラーまたはHTTPエラーが発生した場合, kusa shall ステータスコードと原因を含むエラーメッセージを表示する
5. The kusa shall 取得した内容を一時バッファとして保持し、ファイルとして保存しない

### Requirement 5: 一時バッファ表示
**Objective:** ターミナルAI開発者として、ファイル以外のソースから取得したMarkdownが一時的な読み取り専用バッファとして表示されてほしい。保存操作の心配なく気軽にプレビューに集中するため。

#### Acceptance Criteria
1. The kusa shall ファイル以外のソース（stdin、クリップボード、URL、GitHub shorthand）から取得した内容を一時バッファモードで表示する
2. While 一時バッファモードで表示中, kusa shall 編集モードへの切り替えを無効化する（将来のinline-edit featureとの整合性）
3. The kusa shall 一時バッファの内容をメモリ上にのみ保持し、ディスクに書き込まない
4. When ユーザーがウィンドウを閉じた場合, kusa shall 一時バッファの内容を破棄する
5. The kusa shall タイトルバーにソース種別を表示し、通常のファイル表示と一時バッファ表示を視覚的に区別する

### Requirement 6: 入力ソースの優先順位と排他制御
**Objective:** ターミナルAI開発者として、複数の入力ソースが同時に指定された場合の動作が予測可能であってほしい。意図しない動作を避け安心して使えるため。

#### Acceptance Criteria
1. The kusa shall 入力ソースの優先順位を次の順序で適用する: (1) stdinパイプ (2) --clipboard フラグ (3) CLIファイル/ディレクトリ引数 (4) gh: shorthand / URL引数
2. If stdinにデータが存在し、かつファイル引数も指定された場合, kusa shall stdinの内容を優先してプレビュー表示する
3. When 入力ソースが決定された場合, kusa shall 他の入力ソースからの読み取りをスキップする
