# Implementation Plan

## Tasks

- [ ] 1. Rust バックエンド: stdin パイプ読み取り
- [ ] 1.1 (P) stdin パイプ判定と読み取りロジックを実装する
  - `is-terminal` crate を Cargo.toml に追加
  - `main.rs` の Tauri builder 前に `std::io::stdin().is_terminal()` でパイプ判定
  - パイプ接続時に `read_to_string` で全内容を読み取り（10MB 上限でガード）
  - `InputContent` 型を定義し stdin 内容を格納
  - `StdinState` を `tauri::manage()` で managed state に登録
  - Rust ユニットテストでパイプ判定ロジックを検証
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 1.2 (P) `read_stdin` IPC コマンドを実装する
  - `StdinState` から内容を返す IPC コマンドを作成
  - stdin 内容がない場合は `None` を返す
  - capabilities に IPC コマンドの権限を追加
  - Rust ユニットテストで正常系（内容あり）・空系（内容なし）を検証
  - _Requirements: 1.1, 1.4, 1.6_

- [ ] 2. Rust バックエンド: クリップボード読み取り
- [ ] 2.1 `tauri-plugin-clipboard-manager` を導入し `read_clipboard` コマンドを実装する
  - `tauri-plugin-clipboard-manager` を Cargo.toml と tauri.conf.json に追加
  - capabilities にクリップボード read 権限を追加
  - クリップボードからテキストを読み取り `InputContent` 型で返す IPC コマンドを作成
  - テキストが空/存在しない場合は構造化エラーを返す
  - Rust ユニットテストで正常系・空クリップボードを検証
  - _Requirements: 2.1, 2.4, 2.5_

- [ ] 2.2 (P) CLI に `--clipboard` / `-c` フラグを追加する
  - tauri.conf.json の `plugins.cli.args` に `clipboard` フラグ定義を追加
  - 短縮フラグ `-c` を設定
  - Rust 側の CLI 引数パーサーがフラグを認識することを確認
  - _Requirements: 2.1, 2.2_

- [ ] 3. Rust バックエンド: URL/GitHub fetch
- [ ] 3.1 `reqwest` を導入し `fetch_url` IPC コマンドを実装する
  - `reqwest` (features: ["json", "rustls-tls"]) と `base64` crate を Cargo.toml に追加
  - タイムアウト 10 秒の HTTP クライアントを構築
  - User-Agent ヘッダー "kusa-md-viewer" を設定
  - 指定 URL に GET リクエストを送信し `InputContent` 型で返す IPC コマンドを作成
  - URL スキームを `http://` / `https://` に限定（`file://` 等を拒否）
  - capabilities に HTTP 通信権限を追加
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 3.2 GitHub API レスポンスの base64 デコードを実装する
  - `is_github_api` フラグが true の場合、レスポンスを GitHub Contents API 形式としてパース
  - `GitHubContentsResponse` 構造体を定義（content, encoding, name フィールド）
  - base64 エンコードされた content をデコードし UTF-8 文字列に変換
  - デコードエラー時の構造化エラーレスポンスを実装
  - Rust ユニットテストで base64 デコードの正常系・異常系を検証
  - _Requirements: 3.1, 3.2_

- [ ] 3.3 (P) HTTP エラーハンドリングを実装する
  - ネットワーク接続エラー: 「ネットワーク接続エラー: {detail}」
  - HTTP 404: 「リポジトリまたはファイルが見つかりません」
  - HTTP 403 + `X-RateLimit-Remaining: 0`: レート制限メッセージ + `X-RateLimit-Reset` から待ち時間を計算
  - タイムアウト: 「リクエストがタイムアウトしました（10秒）」
  - その他 HTTP エラー: ステータスコード + 原因を含むメッセージ
  - Rust ユニットテストで各エラーパターンのメッセージ生成を検証
  - _Requirements: 3.5, 3.6, 4.4_

- [ ] 4. 共有型定義
- [ ] 4.1 InputContent 型と InputSource 型を TypeScript / Rust 双方に定義する
  - Rust 側: `InputContent` struct と serde Serialize derive を定義
  - TypeScript 側: `InputContent` interface と `InputSource` type を定義
  - 型フィールドの一致を確認（source, content, title, filePath/file_path）
  - instant-read の `read_file` 戻り値を `InputContent` 型に統合する方針を検討
  - _Requirements: 1.4, 2.5, 3.7, 4.5, 5.1_

- [ ] 5. フロントエンド: GitHub shorthand パーサー
- [ ] 5.1 (P) `gh:` shorthand パース関数を実装する
  - `gh:owner/repo/path/to/file.md` 形式のパースロジック
  - パスなし `gh:owner/repo` の場合に `README.md` を自動補完
  - パース結果を `GitHubTarget` 型（owner, repo, path, apiUrl, displayTitle）で返す
  - 不正形式の場合は `null` を返す
  - ユニットテストで正常系（パスあり、パスなし）・異常系（不正形式）を検証
  - _Requirements: 3.1, 3.2_

- [ ] 5.2 (P) GitHub URL パース関数を実装する
  - `https://github.com/owner/repo/blob/branch/path` 形式のパースロジック
  - branch 情報を `?ref=branch` パラメータとして API URL に付与
  - `isGitHubUrl()` 判定関数を実装
  - ユニットテストで blob URL、tree URL、不正 URL を検証
  - _Requirements: 3.3_

- [ ] 6. フロントエンド: 入力ソース解決
- [ ] 6.1 InputSourceResolver サービスを実装する
  - 優先順位ロジック: stdin → clipboard flag → file/dir arg → gh:/URL arg → default
  - stdin の確認: `read_stdin` IPC を呼び出し、内容があればそれを返す
  - clipboard flag の確認: CLI args から `--clipboard` フラグを検出し `read_clipboard` IPC を呼び出す
  - 引数の種別判定: `isGitHubShorthand()`, `isGitHubUrl()`, `isUrl()`, ローカルパスの判定
  - GitHub/URL の場合: パース → `fetch_url` IPC を呼び出し
  - ローカルパスの場合: instant-read の既存フローに委譲
  - 引数なしの場合: `null` を返し既存のファイル一覧表示にフォールバック
  - ユニットテストで優先順位の組み合わせを検証
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. フロントエンド: バッファ管理
- [ ] 7.1 BufferManager を実装する
  - `createBufferManager()` ファクトリ関数で Signal ベースの状態管理を構築
  - `inputContent` Signal: 現在の入力コンテンツを保持
  - `isBufferMode` 派生: source が 'file' 以外の場合 true
  - `isEditable` 派生: `isBufferMode` が true の場合 false
  - `setContent()`: 入力コンテンツを設定しタイトルバーを更新
  - `clear()`: バッファをクリア（メモリ解放）
  - ユニットテストで状態遷移と派生状態を検証
  - _Requirements: 1.4, 2.5, 3.7, 4.5, 5.1, 5.2, 5.3, 5.4_

- [ ] 7.2 (P) TitleBarController を実装する
  - `updateWindowTitle()` 関数: `InputContent` の source と title から "kusa - {title}" 形式でタイトルを設定
  - Tauri Window API の `appWindow.setTitle()` を使用
  - ソース種別ごとのフォーマット: "(stdin)", "(clipboard)", "gh:owner/repo/file.md", URL, ファイル名
  - ユニットテストでタイトルフォーマットロジックを検証
  - _Requirements: 1.5, 2.3, 3.4, 4.3, 5.5_

- [ ] 8. App シェル拡張
- [ ] 8.1 App コンポーネントに一時バッファ表示モードを統合する
  - `viewMode` に `'buffer'` と `'loading'` を追加
  - 起動フロー: `'loading'` → InputSourceResolver.resolve() → 結果に応じて viewMode を設定
  - バッファモード時: BufferManager.setContent() → MarkdownPipeline.process() → Preview 表示
  - ファイルモード時: 既存の instant-read フローに委譲
  - `'loading'` 時のローディングインジケーター表示
  - 一時バッファモード時に将来の編集ボタン/ショートカットを無効化する準備
  - _Requirements: 5.1, 5.2, 6.1_

- [ ] 8.2 エラー表示を各入力ソースのエラーに対応させる
  - 既存 ErrorDisplay コンポーネントを拡張
  - クリップボード空: 「クリップボードにテキストが見つかりません」
  - ネットワークエラー: 接続エラー、404、レート制限、タイムアウトの表示
  - 不正な gh: shorthand: 「GitHub shorthand の形式が不正です。正しい形式: gh:owner/repo/path」
  - エラー種別に応じたアイコンと色分け
  - _Requirements: 2.4, 3.5, 3.6, 4.4_

- [ ] 9. CLI 引数拡張とフロントエンド接続
- [ ] 9.1 CLI 引数の拡張と入力ソース解決の接続を実装する
  - `--clipboard` / `-c` フラグのフロントエンド側受け取り（`getMatches()` 経由）
  - CLI 引数（ファイルパス / gh: shorthand / URL）のフロントエンド側受け取り
  - App 起動時に InputSourceResolver.resolve() を呼び出す接続
  - 結果に応じて viewMode と inputContent を設定
  - hidden window → 表示のタイミング制御（コンテンツ準備完了後）
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 4.1, 6.1_

- [ ] 10. 結合テスト
- [ ] 10.1 stdin パイプ入力の結合テストを実施する
  - `echo "# test" | kusa` → ウィンドウ表示 → "(stdin)" タイトル → プレビュー内容確認
  - 空 stdin → ファイル一覧にフォールバック確認
  - 大きな stdin 入力（1MB+）→ プログレッシブレンダリング確認
  - _Requirements: 1.1, 1.5, 1.6_

- [ ] 10.2 クリップボード入力の結合テストを実施する
  - `kusa --clipboard` → "(clipboard)" タイトル → プレビュー内容確認
  - `kusa -c` → 短縮フラグでも同様に動作確認
  - 空クリップボード → エラーメッセージ表示確認
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 10.3 GitHub shorthand / URL の結合テストを実施する
  - `kusa gh:owner/repo/file.md` → GitHub API fetch → プレビュー表示確認（モックサーバー使用）
  - `kusa gh:owner/repo` → README.md 自動補完 → 表示確認
  - `kusa https://raw.githubusercontent.com/...` → URL fetch → 表示確認
  - 404 → エラーメッセージ表示確認
  - ネットワーク切断 → エラーメッセージ表示確認
  - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.4_

- [ ] 10.4 入力ソース優先順位の結合テストを実施する
  - stdin + file 引数 → stdin が優先されることを確認
  - --clipboard + file 引数 → clipboard が優先されることを確認
  - 通常のファイル引数 → instant-read と同じ動作を確認
  - _Requirements: 6.1, 6.2, 6.3_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.1, 1.2, 9.1, 10.1 |
| 1.2 | 1.1, 1.2, 9.1 |
| 1.3 | 1.1, 1.2 |
| 1.4 | 1.2, 4.1, 7.1 |
| 1.5 | 7.2, 10.1 |
| 1.6 | 1.2, 6.1, 10.1 |
| 2.1 | 2.1, 2.2, 9.1, 10.2 |
| 2.2 | 2.2, 9.1, 10.2 |
| 2.3 | 7.2, 10.2 |
| 2.4 | 2.1, 8.2, 10.2 |
| 2.5 | 2.1, 4.1, 7.1 |
| 3.1 | 3.1, 3.2, 5.1, 9.1, 10.3 |
| 3.2 | 3.2, 5.1, 10.3 |
| 3.3 | 5.2, 9.1 |
| 3.4 | 7.2 |
| 3.5 | 3.3, 8.2, 10.3 |
| 3.6 | 3.3, 8.2 |
| 3.7 | 4.1, 7.1 |
| 4.1 | 3.1, 9.1, 10.3 |
| 4.2 | 3.1, 9.1 |
| 4.3 | 7.2 |
| 4.4 | 3.3, 8.2, 10.3 |
| 4.5 | 4.1, 7.1 |
| 5.1 | 4.1, 7.1, 8.1 |
| 5.2 | 7.1, 8.1 |
| 5.3 | 7.1 |
| 5.4 | 7.1 |
| 5.5 | 7.2 |
| 6.1 | 6.1, 8.1, 9.1, 10.4 |
| 6.2 | 6.1, 10.4 |
| 6.3 | 6.1, 10.4 |

## Parallel Execution Notes

タスク4（共有型定義）は他の全タスクの前提となるため最初に実行。

タスク4完了後、以下が並列実行可能:
- **Task 1.1 + 1.2**: stdin 読み取り（Rust のみ、他に依存なし）
- **Task 2.1 + 2.2**: クリップボード読み取り（プラグイン導入 + CLI フラグ追加）
- **Task 3.1 + 3.2 + 3.3**: URL/GitHub fetch（reqwest 導入 + デコード + エラー処理）
- **Task 5.1 + 5.2**: GitHub shorthand パーサー（純粋関数、外部依存なし）

Task 6（InputSourceResolver）は Task 1, 2, 3, 5 の成果物を統合するため、これらの完了後に実行。
Task 7（BufferManager + TitleBarController）は Task 4 以降いつでも開始可能だが、Task 6 との接続が必要。7.2 は並列実行可能。
Task 8（App シェル拡張）は Task 6, 7 の完了後に実行。
Task 9（CLI 接続）は Task 2.2, 6, 8 の完了後に実行。
Task 10（結合テスト）は全機能実装後に実行。
