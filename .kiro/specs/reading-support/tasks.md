# Implementation Plan

## Tasks

- [ ] 1. MarkdownPipeline 拡張と見出し抽出基盤
- [ ] 1.1 rehype-slug を導入し見出しにIDを自動付与する
  - rehype-slug パッケージをインストール
  - 既存の MarkdownPipeline に rehype-slug プラグインを追加
  - 見出しテキストからslug生成されたIDが `<h1 id="...">` 等に付与されることを検証
  - 日本語見出し、特殊文字、重複見出しのID生成を確認
  - _Requirements: 1.1_

- [ ] 1.2 HeadingExtractor サービスを実装する
  - Markdown文字列からmdastを解析し、heading ノードを走査するサービスを作成
  - 各見出しのlevel、text、id（rehype-slug互換）、indexを抽出
  - MarkdownPipelineService に `extractHeadings(markdown: string): HeadingInfo[]` メソッドを追加
  - ユニットテスト: h1-h6の抽出、見出しなし、ネストされた見出し、特殊文字
  - _Requirements: 1.1, 1.5_

- [ ] 2. GFMレンダリング品質の向上
- [ ] 2.1 (P) GFM要素のスタイリングを整備する
  - テーブル: 罫線、ヘッダー背景色、セル余白、レスポンシブ（横スクロール）
  - チェックリスト: チェックボックスUI、リストスタイルの調整
  - 脚注: インラインリンクのスタイル、ページ下部の脚注セクション区切り
  - 取り消し線、自動リンクのスタイル確認
  - ダーク/ライト両テーマでの表示確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2.2 (P) GitHub風タイポグラフィとレイアウトを適用する
  - 見出し: h1-h6 のフォントサイズ、ウェイト、マージン、下線（h1, h2）
  - リスト: ネストレベルに応じたインデント、マーカースタイル
  - 引用: 左ボーダー、背景色、テキスト色
  - コードブロック: 角丸、背景色、余白
  - 画像: max-width: 100%、角丸
  - リンク: アクセントカラー、ホバー効果
  - 全体の max-width と line-height の最適化
  - _Requirements: 4.5, 4.6_

- [ ] 3. シンタックスハイライト強化
- [ ] 3.1 Shiki の dual theme を設定する
  - rehype-pretty-code の設定で `github-dark` と `github-light` の dual theme を有効化
  - CSS custom properties でテーマに応じたコードブロック配色を切替
  - JavaScript, TypeScript, Rust, Python, Go, JSON, YAML, Bash, Markdown で表示を検証
  - _Requirements: 5.1, 5.2, 5.5, 5.6_

- [ ] 3.2 コードブロックのUI拡張を実装する
  - 言語ラベル表示: コードブロック上部に言語名を表示するCSSスタイル
  - コピーボタン: 各コードブロックの右上にコピーボタンを動的追加
  - Clipboard API でコード内容をコピー
  - コピー成功時のフィードバック（アイコン変化: クリップボード -> チェックマーク）
  - Preview レンダリング後のDOM操作で追加（MutationObserver または effect）
  - _Requirements: 5.3, 5.4_

- [ ] 4. TOCパネルとアクティブ見出し追跡
- [ ] 4.1 ActiveHeadingTracker を実装する
  - IntersectionObserver で Preview コンテナ内の heading 要素を監視
  - 可視範囲に入った見出しのうち最上位のものをアクティブとして `activeId` Signal に反映
  - observe/disconnect メソッドでライフサイクル管理
  - ファイル変更時のObserver再設定ロジック
  - ユニットテスト: アクティブ見出しの判定ロジック
  - _Requirements: 2.1, 2.2_

- [ ] 4.2 TOCPanel コンポーネントを実装する
  - HeadingExtractor から取得した見出しリストを階層表示
  - レベルに応じたインデント（Tailwind の ml-* クラス）
  - クリックで `element.scrollIntoView({ behavior: 'smooth' })` を発火
  - ActiveHeadingTracker の `activeId` を購読しアクティブ項目をハイライト
  - アクティブ項目がTOCパネルの可視範囲外の場合、パネル内を自動スクロール
  - TOC表示/非表示トグルのSignalと、ショートカットキーの接続
  - 見出しなし時に非表示
  - ダーク/ライトテーマ対応のスタイリング
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [ ] 4.3 App シェルに TOCPanel を統合する
  - App レイアウトに TOCPanel を左サイド（または設定可能な位置）に配置
  - TOCパネルの幅とPreview領域のレスポンシブ調整
  - TOCの表示/非表示でPreview幅が動的に変化
  - _Requirements: 1.1, 1.4_

- [ ] 5. Vim ナビゲーションと見出しジャンプ
- [ ] 5.1 VimNavHandler を実装する
  - キーシーケンスの状態管理（`g` -> `d`, `]` -> `]`, `[` -> `[`, `g` -> `g`）
  - タイムアウト処理: 500ms以内にシーケンス未完了でリセット
  - 既存 KeyboardHandler との統合（`:q`, `Cmd+W` との競合回避）
  - `gg`: Preview コンテナの先頭にスクロール
  - `G`: Preview コンテナの末尾にスクロール
  - `]]`: 現在位置から次の見出しにジャンプ
  - `[[`: 現在位置から前の見出しにジャンプ
  - `gd`: HeadingPicker を表示
  - ユニットテスト: キーシーケンスの解釈、タイムアウト、無効シーケンスの処理
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.2 HeadingPicker コンポーネントを実装する
  - 見出しリストをオーバーレイモーダルとして表示
  - レベルに応じたインデント表示
  - 上下キーで選択移動、Enter で確定、Esc でキャンセル
  - テキスト入力によるインクリメンタルフィルタ
  - 選択確定時に `scrollIntoView` でジャンプ
  - ダーク/ライトテーマ対応
  - _Requirements: 3.1, 3.6_

- [ ] 6. カラースキーマシステム
- [ ] 6.1 CSS custom properties によるテーマ変数を定義する
  - `:root` と `.dark` / `.light` でテーマ変数を定義
  - 変数: `--color-bg`, `--color-text`, `--color-heading`, `--color-link`, `--color-border`, `--color-code-bg`, `--color-toc-bg`, `--color-toc-active`, `--color-progress` 等
  - 既存の Tailwind dark mode 設定と統合
  - Preview、TOC、コードブロック、UIコンポーネントに変数を適用
  - _Requirements: 6.4_

- [ ] 6.2 ThemeManager を実装する
  - `currentTheme` Signal でテーマ状態を管理
  - `<html>` 要素の class 切替 (`dark` / `light`)
  - 起動時: `load_preference('theme')` で保存済みテーマを読み込み
  - 未設定時: `matchMedia('(prefers-color-scheme: dark)')` で OS に追従
  - `isUserExplicit` フラグで OS 追従 / ユーザー明示設定を区別
  - OS ダークモード変更時のリスナー登録と応答
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 6.3 テーマ切替ショートカットとIPC永続化を接続する
  - テーマ切替のキーボードショートカットを KeyboardHandler に登録
  - 切替時に `save_preference('theme', 'dark' | 'light')` を IPC 経由で呼び出し
  - _Requirements: 6.2, 6.3_

- [ ] 6.4 Rust IPC で設定ファイル読み書きコマンドを実装する
  - `save_preference(key, value)` コマンド: `~/.config/kusa/preferences.json` に JSON 形式で保存
  - `load_preference(key)` コマンド: 設定ファイルから指定キーの値を読み取り
  - ディレクトリ自動作成、部分更新（既存設定を保持しつつキーのみ更新）
  - ファイル/ディレクトリ不存在時のグレースフル処理
  - Tauri の fs 権限スコープに `~/.config/kusa/` を追加
  - Rust ユニットテスト: 正常系、ファイルなし、キーなし、ディレクトリ作成
  - _Requirements: 6.3_

- [ ] 7. フォーカスモード
- [ ] 7.1 FocusMode を実装する
  - `isEnabled` Signal でフォーカスモードの有効状態を管理
  - ActiveHeadingTracker の `activeId` を購読
  - アクティブセクション以外の要素に CSS `opacity: 0.2` を適用
  - セクション境界の判定: 対象見出しから同レベル以上の次の見出しまでの範囲
  - アクティブセクション変更時のトランジション（CSS transition: opacity 0.3s）
  - 無効化時に全要素の opacity を 1.0 に復元
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7.2 フォーカスモードのショートカットを接続する
  - キーボードショートカットを KeyboardHandler に登録
  - トグル操作で FocusMode の isEnabled を切り替え
  - _Requirements: 7.4_

- [ ] 8. リーディング進捗表示
- [ ] 8.1 ReadingProgress コンポーネントを実装する
  - Preview コンテナの scroll イベントを購読
  - `(scrollTop / (scrollHeight - clientHeight)) * 100` でパーセンテージ算出
  - requestAnimationFrame で scroll イベントを throttle
  - ドキュメント上部に固定表示のプログレスバー（高さ 3px 程度）
  - パーセンテージ数値の表示（バーの右端またはホバー時）
  - テーマ変数 `--color-progress` を使用した配色
  - ドキュメントがビューポートより短い場合は非表示
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. 結合テストとポリッシュ
- [ ] 9.1 全コンポーネントの結合テストを実施する
  - TOCナビゲーション: ファイル表示 -> TOC表示 -> クリック -> 見出しスクロール
  - キーボードナビゲーション: `]]`/`[[` 連打で見出し順に移動
  - `gd` -> HeadingPicker -> 選択 -> ジャンプ
  - テーマ切替 -> 全コンポーネントの配色変更確認
  - テーマ永続化 -> アプリ再起動 -> テーマ復元確認
  - フォーカスモード -> セクション遷移 -> フォーカス移動確認
  - リーディング進捗 -> スクロールでプログレスバー更新確認
  - _Requirements: 1.1, 1.3, 2.1, 3.1, 3.2, 6.2, 6.3, 7.1, 8.1_

- [ ] 9.2 (P) パフォーマンスの確認と調整を行う
  - 大きなMarkdownファイル（100見出し超）でのTOCレンダリング速度確認
  - 高速スクロール時のIntersectionObserver応答性確認
  - ReadingProgress の scroll throttle が描画ジャンクを起こさないことを確認
  - フォーカスモードの opacity トランジションのスムーズさ確認
  - _Requirements: 2.1, 8.2_

- [ ] 9.3 (P) アクセシビリティとエッジケースの確認を行う
  - TOCPanel の `role="navigation"` と `aria-label` 設定
  - HeadingPicker の `role="listbox"` とキーボードアクセシビリティ
  - 見出しが0個のファイルでの全機能の動作確認
  - 見出しが1個だけのファイルでの `]]`/`[[` の挙動
  - 非常に長い見出しテキストのTOC表示（truncation）
  - ファイル切替時の状態リセット（TOC、アクティブ見出し、フォーカスモード、進捗）
  - _Requirements: 1.5, 3.2, 3.3_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.1, 1.2, 4.2, 4.3 |
| 1.2 | 4.2 |
| 1.3 | 4.2, 9.1 |
| 1.4 | 4.2, 4.3 |
| 1.5 | 1.2, 4.2, 9.3 |
| 2.1 | 4.1, 4.2, 9.1, 9.2 |
| 2.2 | 4.1, 4.2 |
| 2.3 | 4.2 |
| 3.1 | 5.1, 5.2, 9.1 |
| 3.2 | 5.1, 9.1, 9.3 |
| 3.3 | 5.1, 9.3 |
| 3.4 | 5.1 |
| 3.5 | 5.1 |
| 3.6 | 5.2 |
| 4.1 | 2.1 |
| 4.2 | 2.1 |
| 4.3 | 2.1 |
| 4.4 | 2.1 |
| 4.5 | 2.2 |
| 4.6 | 2.2 |
| 5.1 | 3.1 |
| 5.2 | 3.1 |
| 5.3 | 3.2 |
| 5.4 | 3.2 |
| 5.5 | 3.1 |
| 5.6 | 3.1 |
| 6.1 | 6.2 |
| 6.2 | 6.2, 6.3 |
| 6.3 | 6.3, 6.4 |
| 6.4 | 6.1 |
| 6.5 | 6.2 |
| 7.1 | 7.1, 9.1 |
| 7.2 | 7.1 |
| 7.3 | 7.1 |
| 7.4 | 7.2 |
| 8.1 | 8.1, 9.1 |
| 8.2 | 8.1, 9.2 |
| 8.3 | 8.1 |
| 8.4 | 8.1 |

## Parallel Execution Notes

タスク1（パイプライン拡張・見出し抽出基盤）完了後、以下が並列実行可能:
- **Task 2.1 + 2.2**: GFMスタイリングとタイポグラフィは互いに独立
- **Task 3.1 + 3.2**: Shiki dual themeとコードブロックUI拡張は互いに独立（ただし3.1のdual theme設定が3.2のスタイルに影響する場合は逐次）

タスク1完了後、タスク4（TOC + アクティブ追跡）はタスク2, 3と並列実行可能。

タスク5（Vimナビゲーション）はタスク4（TOCPanel + ActiveHeadingTracker）の成果物を利用するため、タスク4完了後に実行。

タスク6（カラースキーマ）はタスク1完了後から着手可能。タスク6.1-6.3（フロントエンド）と6.4（Rust IPC）は並列実行可能。

タスク7（フォーカスモード）はタスク4.1（ActiveHeadingTracker）完了後に実行。

タスク8（リーディング進捗）はタスク1完了後から着手可能。他タスクとの依存なし。

タスク9（結合テスト・ポリッシュ）は全機能実装後に実行。9.2 と 9.3 は並列実行可能。
