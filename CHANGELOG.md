# Changelog

All notable changes to this project will be documented in this file.

## [0.3.9] - 2026-04-10

### Fixed

- **相対パスが解決できない問題**: `open -a` によるrelaunch時にcwdが変わるため、相対パスのファイルが開けなかった。relaunch前に全ての相対パスをcwd基準で絶対パスに変換するように修正。ファイルが存在しない場合でもcwdと結合して絶対パス化する。

## [0.3.8] - 2026-04-10

### Fixed

- **起動時にローディングで止まる問題**: `onMount` 内の初期化処理でエラーが発生した場合にウィンドウが表示されず、`viewMode` が `"loading"` のまま永遠に止まるバグを修正。`setupTauriListeners()` のエラーハンドリング追加、CLI引数なし時のdemoモードフォールバック、2秒タイムアウトによる強制遷移、`finally` ブロックでのウィンドウ表示保証を実装。

## [0.3.7] - 2026-03-13

### Changed

- **コードブロック折り返し**: プレビューのコードブロックが横スクロールではなく折り返し表示されるように変更。Vim-first の思想に沿い、横スクロール操作を排除。

## [0.3.6] - 2026-03-13

### Fixed

- **CLI プロセスが終了しない問題**: stdin が `/dev/null` にリダイレクトされた場合（Claude Code の Bash ツール等）、`is_terminal()` が false になり auto-detach がスキップされてプロセスがブロックし続けるバグを修正。`libc::fstat` で stdin が実際のパイプ（FIFO）かどうかを判定し、パイプ入力時のみ直接実行、それ以外は detach するように変更。

## [0.3.5] - 2026-03-13

### Fixed

- **コンテキストメニュー改善**: カスタムメニューがデフォルトの右クリックメニューを完全に置き換えてしまい、テキスト選択のコピーができなくなっていた問題を修正。Copy（⌘C）と Select All（⌘A）をメニュー項目に追加し、選択範囲がない場合は Copy を無効化表示。

## [0.3.4] - 2026-03-13

### Added

- **右クリックコンテキストメニュー**: プレビューエリアで右クリックするとカスタムメニューを表示。「Copy Markdown」で生のMarkdownソースをコピー、「Copy as Rich Text」でリッチテキストコピー。Preview / Split 両モード対応。

## [0.3.3] - 2026-03-13

### Added

- **Split view コピーボタン**: Split view（Ctrl+E）のプレビューペインにもフローティングコピーボタンを表示。ホバーで表示、クリック or `⌘⇧C` でリッチテキストコピー。

## [0.3.2] - 2026-03-13

### Added

- **コピーボタン**: プレビュー右上にフローティングコピーボタンを追加。ホバーで表示、クリックでリッチテキストコピー。

### Fixed

- **CLI プロセスが残り続ける問題**: `kusa file.md` 実行後にターミナルプロセスがブロックし続けるバグを修正。`--launched` フラグによるリラウンチループ防止を導入。

## [0.3.0] - 2026-03-13

### Added

- **Rich text copy** (`Cmd+Shift+C`): プレビューをリッチテキスト（HTML + plain text）としてクリップボードにコピー。Slack, Notion, Google Docs 等にそのまま貼り付け可能。
- `kusa --version` / `kusa -V` でバージョン表示。

### Fixed

- `Ctrl+E` が Split モードへの一方通行だったバグを修正。Preview ↔ Split のトグルとして動作するように。

## [0.2.0] - 2026-03-12

### Added

- **CLI auto-detach**: ターミナルから `kusa file.md` 実行時に `open(1)` 経由でリラウンチし、CLI が即座に返るように。
- **Claude Code integration**: kusa スキル + auto-launch 設定。

## [0.1.0] - 2026-03-12

### Added

- Markdown ファイルのプレビュー表示（GitHub Flavored Markdown 対応）
- CodeMirror 6 + vim mode での編集
- Split view（エディター左 + プレビュー右）
- CLI 起動（`kusa file.md` / `kusa .`）
- ファイルのドラッグ&ドロップ
- ダークテーマ（One Dark）
- ファイル保存（auto-save + manual `:w`）
- Shiki によるシンタックスハイライト
- vim スタイルキーバインド（`:q` 終了、`:wq` 保存終了、`jk` Escape）
- コードブロックのコピーボタン
- タブ対応（複数ファイル）
- タブのドラッグ&ドロップ並び替え
- TOC パネル（`Ctrl+B`）
- ファイル検索（`Cmd+P`）
- ドキュメント内検索（`Cmd+F` / `/`）
- Buffer split（`Ctrl+W v` で2ファイル並列表示）
- Peek mode（`-p` フラグでオーバーレイウィンドウ）
- クリップボード表示（`Cmd+Shift+V` / `-c` フラグ）
- 印刷サポート（`:p`）
- フォーカスモード（`Cmd+Shift+F`）
- ズーム（`Cmd++` / `Cmd+-` / `Cmd+0`）
- テーマ切り替え（`Ctrl+T`）
- IME 入力の vim normal モードでのブロック
- Homebrew tap 経由のインストール

[0.3.9]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.9
[0.3.8]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.8
[0.3.7]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.7
[0.3.6]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.6
[0.3.5]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.5
[0.3.4]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.4
[0.3.3]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.3
[0.3.2]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.2
[0.3.0]: https://github.com/kaze-jp/kusa/releases/tag/v0.3.0
[0.2.0]: https://github.com/kaze-jp/kusa/releases/tag/v0.2.0
[0.1.0]: https://github.com/kaze-jp/kusa/releases/tag/v0.1.0
