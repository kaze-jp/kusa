# Requirements Document

## Introduction
kusaの最初のコア体験「Instant Read」の要件定義。ターミナルAI開発者（Claude Code + Ghostty等）が、生成されたMarkdownファイルを**一瞬で・軽量に・きれいに**読めることをゴールとする。VS Codeを開くことなく、ターミナルワークフローを中断せずにMarkdownプレビューを得る体験を実現する。

## Requirements

### Requirement 1: CLI起動
**Objective:** ターミナルAI開発者として、CLIからMarkdownファイルを指定して即座にプレビューを表示したい。ターミナルワークフローを中断せずにMDを確認するため。

#### Acceptance Criteria
1. When ユーザーが `kusa <file.md>` を実行した場合, kusa shall Markdownファイルをプレビュー表示するウィンドウを起動する
2. When ユーザーが `kusa <directory>` を実行した場合, kusa shall 指定ディレクトリ内のMarkdownファイル一覧を表示する
3. When ユーザーが引数なしで `kusa` を実行した場合, kusa shall カレントディレクトリのMarkdownファイル一覧を表示する
4. If 指定されたファイルが存在しない場合, kusa shall ファイルパスを含むエラーメッセージを表示し、非ゼロの終了コードで終了する
5. If 指定されたファイルがMarkdown形式でない場合, kusa shall プレーンテキストとしてファイルを表示する

### Requirement 2: 起動速度
**Objective:** ターミナルAI開発者として、MDファイルを指定してから200ms以内にプレビューが表示されてほしい。ターミナル作業の流れを止めないため。

#### Acceptance Criteria
1. When ユーザーがファイルを指定して起動した場合, kusa shall 200ms以内にウィンドウを表示し、Markdownのレンダリングを開始する
2. The kusa shall Electron不使用・Chromium非同梱のTauri v2アーキテクチャで構築される
3. When 大きなMarkdownファイル（1MB以上）を開いた場合, kusa shall まず先頭部分を表示し、残りを非同期でレンダリングする

### Requirement 3: ファイルドラッグ&ドロップ
**Objective:** ターミナルAI開発者として、ファイルマネージャからMDファイルをドラッグ&ドロップで開きたい。CLIを使わずにファイルを素早く開くため。

#### Acceptance Criteria
1. When ユーザーがMarkdownファイルをkusaウィンドウにドラッグ&ドロップした場合, kusa shall そのファイルのプレビューを表示する
2. When 複数のMarkdownファイルをドラッグ&ドロップした場合, kusa shall 最初のファイルをプレビュー表示する
3. If ドロップされたファイルがMarkdown形式でない場合, kusa shall プレーンテキストとして表示する

### Requirement 4: ファイルリンク起動
**Objective:** ターミナルAI開発者として、Ghostty/iTerm等のターミナルエミュレータのファイルリンクからMDファイルをワンクリックで開きたい。ターミナル出力のファイルパスから直接MDを確認するため。

#### Acceptance Criteria
1. The kusa shall OSのファイル関連付け（macOSの`open`コマンド等）を通じて.mdファイルを開けるように登録される
2. When ターミナルエミュレータのファイルリンクがクリックされた場合, kusa shall 対象のMarkdownファイルをプレビュー表示する

### Requirement 5: Markdownレンダリング
**Objective:** ターミナルAI開発者として、GitHub Flavored Markdownが正しく美しくレンダリングされてほしい。VS Codeと同等以上の読みやすさでMarkdownを確認するため。

#### Acceptance Criteria
1. The kusa shall GitHub Flavored Markdown（テーブル、チェックリスト、取り消し線、脚注）をレンダリングする
2. The kusa shall コードブロックのシンタックスハイライトを表示する
3. The kusa shall ダークテーマをデフォルトのカラースキーマとして適用する
4. The kusa shall 見出し、リスト、引用、リンク、画像を正しくレンダリングする
5. While プレビュー表示中, kusa shall 行間・フォントサイズ・マージンを読みやすさに最適化して表示する

### Requirement 6: ウィンドウ管理
**Objective:** ターミナルAI開発者として、MDプレビューウィンドウが軽量で邪魔にならない存在であってほしい。ターミナルワークフローの補助ツールとして機能するため。

#### Acceptance Criteria
1. The kusa shall 単一ウィンドウでMarkdownプレビューを表示する（プロジェクト単位のUIではない）
2. When ユーザーが `Cmd+W` または `:q` を入力した場合, kusa shall ウィンドウを閉じる
3. When ユーザーが新しいファイルを同じkusaインスタンスで開いた場合, kusa shall 既存ウィンドウの内容を新しいファイルに置き換える
4. The kusa shall ウィンドウサイズと位置を記憶し、次回起動時に復元する
