# Requirements Document

## Introduction
kusaの「Reading Support」機能の要件定義。ターミナルAI開発者が長いMarkdownドキュメント（CLAUDE.md、spec、PRレビュー等）を**読むことに最適化された体験**で閲覧できることをゴールとする。美しいGFMレンダリング、見出しベースのナビゲーション、カラースキーマの切替、リーディング進捗の可視化により、スクロールで迷子にならず構造を把握しながら読み進められる体験を実現する。本機能は `instant-read` の上に構築され、既存のPreview/MarkdownPipeline/Appシェルを拡張する。

## Requirements

### Requirement 1: TOC/アウトライン表示
**Objective:** ターミナルAI開発者として、見出しベースのアウトライン（目次）を表示したい。長いMarkdownの全体構造を一目で把握し、目的のセクションに素早くアクセスするため。

#### Acceptance Criteria
1. When ユーザーがMarkdownファイルを開いた場合, kusa shall ファイル内の見出し（h1-h6）を階層構造でTOCパネルに表示する
2. The TOCパネル shall 見出しレベルに応じたインデントで階層関係を視覚的に表現する
3. When ユーザーがTOCの項目をクリックした場合, kusa shall プレビュー内の対応する見出しまでスムーズにスクロールする
4. The TOCパネル shall キーボードショートカットで表示/非表示を切り替えられる
5. When ファイルに見出しが存在しない場合, kusa shall TOCパネルを非表示にし、プレビュー領域を全幅で表示する

### Requirement 2: 現在位置ハイライト
**Objective:** ターミナルAI開発者として、現在読んでいるセクションがTOC上でハイライトされてほしい。長文を読み進める中で自分の現在位置を常に把握するため。

#### Acceptance Criteria
1. While ユーザーがプレビューをスクロールしている間, kusa shall 現在表示中の見出しに対応するTOC項目をハイライトする
2. When スクロールにより現在のセクションが変わった場合, kusa shall TOCのハイライトを新しいセクションに自動的に移動する
3. If ハイライト中のTOC項目がTOCパネルの可視範囲外にある場合, kusa shall TOCパネルをスクロールしてハイライト項目を表示する

### Requirement 3: 見出しジャンプ（Vim motions連携）
**Objective:** ターミナルAI開発者として、キーボード操作で見出し間を素早く移動したい。マウスを使わずにVim風の操作でドキュメント内を効率的にナビゲートするため。

#### Acceptance Criteria
1. When ユーザーが `gd` を入力した場合, kusa shall TOC/見出し選択UIを表示し、選択された見出しにジャンプする
2. When ユーザーが `]]` を入力した場合, kusa shall 次の見出しにジャンプする
3. When ユーザーが `[[` を入力した場合, kusa shall 前の見出しにジャンプする
4. When ユーザーが `gg` を入力した場合, kusa shall ドキュメントの先頭にジャンプする
5. When ユーザーが `G` を入力した場合, kusa shall ドキュメントの末尾にジャンプする
6. While 見出し選択UIが表示されている間, kusa shall キーボードの上下キーとEnterで見出しを選択・確定できる

### Requirement 4: GFMレンダリング品質
**Objective:** ターミナルAI開発者として、GitHub Flavored Markdownが美しく正確にレンダリングされてほしい。VS Code同等以上の読みやすさでMarkdownを確認するため。

#### Acceptance Criteria
1. The kusa shall GFMテーブルを罫線・ヘッダー区別付きで美しくレンダリングする
2. The kusa shall チェックリスト（タスクリスト）をチェックボックスUI付きでレンダリングする
3. The kusa shall 脚注をインラインリンク + ページ下部の脚注一覧としてレンダリングする
4. The kusa shall 取り消し線、自動リンク、絵文字ショートコードを正しくレンダリングする
5. The kusa shall 見出し、リスト、引用、リンク、画像に対してGitHub風の余白・フォントサイズを適用する
6. The kusa shall ネストされたリスト・引用・コードブロックを正しい階層で表示する

### Requirement 5: シンタックスハイライト
**Objective:** ターミナルAI開発者として、コードブロックが言語に応じた高品質なシンタックスハイライトで表示されてほしい。コードの構造を素早く把握するため。

#### Acceptance Criteria
1. The kusa shall コードブロックの言語指定に基づき、トークンレベルのシンタックスハイライトを適用する
2. The kusa shall JavaScript, TypeScript, Rust, Python, Go, JSON, YAML, Bash, Markdown を含む主要言語をサポートする
3. The kusa shall コードブロックに言語ラベルを表示する
4. The kusa shall コードブロックにコピーボタンを表示し、クリックでコード内容をクリップボードにコピーする
5. While ダークテーマが適用されている間, kusa shall ダークテーマに最適化されたシンタックスハイライトカラーを使用する
6. While ライトテーマが適用されている間, kusa shall ライトテーマに最適化されたシンタックスハイライトカラーを使用する

### Requirement 6: カラースキーマ
**Objective:** ターミナルAI開発者として、ダーク/ライトテーマを切り替えたい。時間帯や環境に応じて目に優しい表示で読むため。

#### Acceptance Criteria
1. The kusa shall ダークテーマをデフォルトのカラースキーマとして適用する
2. When ユーザーがテーマ切替ショートカットを入力した場合, kusa shall ダークテーマとライトテーマを切り替える
3. The kusa shall 選択されたテーマをアプリ再起動後も永続化する
4. The kusa shall CSS custom propertiesによるテーマシステムを採用し、プレビュー・TOC・UI全体に一貫したテーマを適用する
5. When OSのダークモード設定が変更された場合, kusa shall ユーザーが明示的にテーマを設定していない限り、OS設定に追従する

### Requirement 7: フォーカスモード
**Objective:** ターミナルAI開発者として、現在読んでいるセクションだけに集中したい。長文の中で注意を散漫にせず、特定セクションの内容に集中するため。

#### Acceptance Criteria
1. When ユーザーがフォーカスモードを有効にした場合, kusa shall 現在のセクション以外のコンテンツを視覚的に薄く表示する
2. When フォーカスモード中にスクロールでセクションが変わった場合, kusa shall フォーカス対象を新しいセクションに自動更新する
3. When ユーザーがフォーカスモードを無効にした場合, kusa shall 全セクションを通常表示に戻す
4. The kusa shall キーボードショートカットでフォーカスモードの有効/無効を切り替えられる

### Requirement 8: リーディング進捗表示
**Objective:** ターミナルAI開発者として、ドキュメント内の読了位置を視覚的に把握したい。長いドキュメントの残り分量を意識しながら読み進めるため。

#### Acceptance Criteria
1. While ユーザーがプレビューをスクロールしている間, kusa shall ドキュメント上部にプログレスバーで読了パーセンテージを表示する
2. The プログレスバー shall スクロール位置に応じてリアルタイムに更新される
3. The kusa shall プログレスバーに現在位置のパーセンテージ数値を表示する
4. The プログレスバー shall 現在のカラースキーマに馴染むデザインで表示される
