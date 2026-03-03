# Implementation Plan

## Tasks

- [ ] 1. CLI フラグ拡張と peek モード判定
- [ ] 1.1 --peek, -p, --no-peek, --no-focus, --size フラグを CLI 定義に追加する
  - tauri.conf.json の cli plugin args に peek, no-peek, no-focus, size の各フラグ定義を追加
  - Rust 側で新フラグを解析し、ウィンドウモード（peek/full）とオプション（no-focus, size preset）を決定するロジックを構築
  - --peek と --no-peek が同時指定された場合に --no-peek を優先する排他制御
  - capabilities に追加フラグに関連する権限が不足していれば追加
  - _Requirements: 1.1, 1.2, 4.2, 4.3, 5.1, 6.2_

- [ ] 1.2 パイプ入力時のデフォルト peek モード判定を実装する
  - stdin がパイプ接続されているかを Rust 側で検出する仕組みを構築
  - stdin にデータがあり、かつ --peek / --no-peek が明示されていない場合に peek モードをデフォルトとする
  - --no-peek フラグ指定時はパイプ入力でもフルウィンドウモードで起動する
  - universal-input feature の stdin 読み取り処理との連携ポイントを確認
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2. ウィンドウプリセットと peek ウィンドウ生成
- [ ] 2.1 (P) ウィンドウサイズプリセットを定義する
  - peek（600x400px）、full（1200x800px）、half（画面幅50% x 画面高さ75%）のプリセットを Rust モジュールとして定義
  - --size フラグの値からプリセットを解決する関数を実装
  - half プリセットの動的計算に Tauri Monitor API を利用
  - 不明なプリセット名にはデフォルト（peek）にフォールバックし警告を出力
  - 将来の設定ファイル対応を意識した構造にする
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2.2 (P) peek ウィンドウの生成構成を実装する
  - WebviewWindowBuilder に peek 固有の構成を適用: decorations false, always_on_top true, inner_size プリセット値, min_inner_size 300x200, resizable true, transparent true
  - --no-focus 指定時に focused false で生成するオプション分岐
  - peek モード時に window-state プラグインによるサイズ永続化をスキップするフラグ管理
  - 既存のフルウィンドウ生成処理との分岐を整理し、モード判定に基づいて適用する構成を切り替え
  - peek ウィンドウ生成失敗時にフルウィンドウモードへフォールバック
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.1, 5.2, 6.4_

- [ ] 3. フルウィンドウ昇格 IPC
- [ ] 3.1 promote_to_full IPC コマンドを実装する
  - Tauri コマンドとして promote_to_full を定義し、ウィンドウプロパティを動的に変更: decorations true, always_on_top false, size 1200x800, center
  - ウィンドウ操作 API（set_decorations, set_always_on_top, set_size, center）を順次実行
  - 各操作の失敗時に Result エラーとして構造化メッセージを返す
  - capabilities に必要な権限を追加
  - Rust ユニットテストで昇格コマンドの引数バリデーションを検証
  - _Requirements: 3.1, 3.3_

- [ ] 4. フロントエンド peek モード状態管理
- [ ] 4.1 WindowModeStore を作成する
  - ウィンドウモード（peek/full）を SolidJS Signal で管理するストアモジュールを作成
  - 起動時に Rust から渡されるモード情報（peek/full）をストアの初期値として設定
  - isPeekMode ヘルパー関数を提供し、各コンポーネントからモード判定できるようにする
  - 昇格時にモード変更をトリガーし、UI 全体に反映する仕組みを構築
  - _Requirements: 3.2, 3.4, 3.5_

- [ ] 5. PeekShell UI コンポーネント
- [ ] 5.1 PeekShell コンポーネントを作成し peek モード固有の UI を適用する
  - peek モード時に表示される UI ラッパーコンポーネントを作成
  - transparent ウィンドウ上で CSS border-radius による角丸表示を実現
  - ドロップシャドウ（box-shadow）を適用しデスクトップ上での overlay 的存在感を演出
  - 既存の Preview コンポーネントをラップし、peek/full 両モードでプレビュー表示を共有
  - ダークテーマに馴染むスタイリング（Tailwind CSS）
  - _Requirements: 7.1, 7.4_

- [ ] 5.2 (P) HintBar コンポーネントを作成する
  - ウィンドウ下部に操作ヒント（Esc: 閉じる / f: フルウィンドウ / q: 閉じる）を表示するコンポーネント
  - 表示後 3 秒で CSS transition を使った自動フェードアウトを実装
  - マウスホバーまたはキー入力イベントで再表示するロジック
  - peek モード時のみ表示し、フルウィンドウ昇格後は非表示にする
  - _Requirements: 7.2, 7.3_

- [ ] 5.3 (P) peek ウィンドウのフォーカス喪失による自動クローズを実装する
  - ウィンドウの blur イベントを検知し、peek モード時にウィンドウを自動クローズする
  - フルウィンドウ昇格後は blur による自動クローズを無効化する
  - no-focus モードでの初回表示時に blur が即座に発火しないよう制御する
  - ウィンドウクリックでフォーカスを取得し、通常の peek モード操作を有効化する
  - _Requirements: 2.3, 3.5, 5.3_

- [ ] 6. PeekKeyHandler キーボード操作
- [ ] 6.1 peek モード固有のキーボードショートカットを実装する
  - Esc キーで peek ウィンドウを即座に閉じる処理
  - q キーで peek ウィンドウを即座に閉じる処理（Esc の補助）
  - f キーでフルウィンドウ昇格を実行: WindowModeStore のモード変更 + promote_to_full IPC 呼び出し
  - peek モード時のみキーハンドラーを有効化し、フルウィンドウ昇格後は instant-read の通常キーバインド（Cmd+W / :q）に委譲
  - 既存の KeyboardHandler（instant-read）との共存を整理し、モードに応じた優先度制御を実装
  - _Requirements: 2.1, 2.2, 3.1, 3.4_

- [ ] 7. App シェル統合
- [ ] 7.1 App ルートコンポーネントに peek モード分岐を統合する
  - 起動時のウィンドウモード情報（peek/full）を CLI 引数から取得し WindowModeStore を初期化
  - peek モード時は PeekShell でラップした Preview を表示
  - フルウィンドウ時は従来の App シェルをそのまま使用
  - フルウィンドウへの昇格時に PeekShell を解除し通常 UI に切り替え
  - コンテンツとスクロール位置が昇格前後で維持されることを確認
  - _Requirements: 3.2, 4.1_

- [ ] 7.2 既存 peek ウィンドウの内容差替を実装する
  - no-focus モードで既にpeekウィンドウが存在する状態で新しいリクエストが来た場合の処理
  - single-instance プラグインとの連携で、新インスタンスの引数を既存 peek ウィンドウに転送
  - 既存 peek ウィンドウの内容を新しいファイルに差し替え、ウィンドウを再利用
  - _Requirements: 5.4_

- [ ] 8. 結合テストと E2E テスト
- [ ] 8.1 peek モードの結合テストを実施する
  - CLI --peek フラグ → peek ウィンドウ構成適用 → プレビュー表示の一連のフロー
  - --size フラグ → プリセット解決 → ウィンドウサイズ適用のフロー
  - --no-focus フラグ → focused false 構成のフロー
  - フラグ競合（--peek + --no-peek）時の排他制御
  - _Requirements: 1.1, 1.2, 5.1, 6.2_

- [ ] 8.2 昇格フローの E2E テストを実施する
  - peek 起動 → f キー → フルウィンドウ化 → コンテンツ維持の検証
  - peek 起動 → Esc → ウィンドウクローズ → プロセス終了の検証
  - peek 起動 → q → ウィンドウクローズの検証
  - パイプ入力 → デフォルト peek 表示の検証
  - no-focus モード → ターミナルフォーカス維持の検証
  - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 4.1_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.1, 2.2, 8.1 |
| 1.2 | 1.1, 8.1 |
| 1.3 | 2.2 |
| 1.4 | 2.2 |
| 1.5 | 2.2 |
| 2.1 | 6.1, 8.2 |
| 2.2 | 6.1, 8.2 |
| 2.3 | 5.3 |
| 2.4 | 8.2 |
| 3.1 | 3.1, 6.1, 8.2 |
| 3.2 | 4.1, 7.1, 8.2 |
| 3.3 | 3.1 |
| 3.4 | 4.1, 6.1 |
| 3.5 | 4.1, 5.3 |
| 4.1 | 1.2, 7.1, 8.2 |
| 4.2 | 1.1, 1.2 |
| 4.3 | 1.1, 1.2 |
| 5.1 | 1.1, 2.2, 8.1 |
| 5.2 | 2.2 |
| 5.3 | 5.3 |
| 5.4 | 7.2 |
| 6.1 | 2.1 |
| 6.2 | 1.1, 2.1, 8.1 |
| 6.3 | 2.1 |
| 6.4 | 2.2 |
| 7.1 | 5.1 |
| 7.2 | 5.2 |
| 7.3 | 5.2 |
| 7.4 | 5.1 |

## Parallel Execution Notes

タスク1（CLI フラグ拡張）完了後、以下が並列実行可能:
- **Task 2.1 + 2.2**: ウィンドウプリセット定義と peek ウィンドウ生成は互いに独立（2.2 は 2.1 のプリセット値をハードコードで先行可能）
- **Task 5.2 + 5.3**: HintBar コンポーネントとフォーカス喪失クローズは互いに独立

Task 3（フルウィンドウ昇格 IPC）は Task 2 完了後に実行（ウィンドウ構成の理解が必要）。
Task 4（WindowModeStore）は Task 1 完了後すぐに開始可能（CLI 引数構造の理解のみ依存）。
Task 5（PeekShell UI）は Task 4 の WindowModeStore に依存。
Task 6（PeekKeyHandler）は Task 3 の IPC と Task 4 の WindowModeStore に依存。
Task 7（App シェル統合）は Task 4, 5, 6 の成果物を統合するため、これらの完了後に実行。
Task 8（テスト）は全機能実装後に実行。
