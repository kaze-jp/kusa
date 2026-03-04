# Implementation Plan

- [x] 1. 依存追加と基盤設定
- [x] 1.1 tauri-plugin-dialog のインストールと設定
  - Rust 側に `tauri-plugin-dialog` クレートを追加し、プラグインを初期化登録する
  - JS 側に `@tauri-apps/plugin-dialog` パッケージを追加する
  - capabilities 設定に dialog パーミッションを追加する
  - `save()` API が正常にインポートできることを確認する
  - _Requirements: 3.1_

- [x] 2. tabStore の untitled バッファ対応
- [x] 2.1 (P) Tab interface に isUntitled フラグを追加
  - Tab 型に untitled 状態を識別するフラグを追加する
  - 既存の `openTab` メソッドで新規タブ作成時にフラグを `false` で初期化する
  - 既存テストがあれば互換性を確認する
  - _Requirements: 1.1_

- [x] 2.2 (P) createUntitledTab メソッドの実装
  - 空コンテンツで新規 untitled タブを作成するメソッドを追加する
  - 連番カウンターを使って "Untitled-1", "Untitled-2" のような名前を生成する
  - タブを閉じても番号を再利用しない（常にインクリメント）
  - 最大タブ数（20）の制限チェックを適用する
  - 作成したタブをアクティブタブに設定する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.3 promoteToFile メソッドの実装
  - untitled タブを file モードに昇格させるメソッドを追加する
  - タブの filePath、fileName を更新し、isUntitled フラグをクリアする
  - タブの id を新しい filePath に変更し、isDirty をクリアする
  - _Requirements: 3.3_

- [x] 2.4 tabStore ユニットテスト
  - createUntitledTab の連番生成と MAX_TABS 制限のテスト
  - promoteToFile のフィールド更新と isUntitled クリアのテスト
  - 既存 openTab との重複チェックが untitled に影響しないことのテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3_

- [x] 3. SyncEngine の auto-save スキップ対応
- [x] 3.1 (P) skipAutoSave オプションの追加
  - SyncEngine の設定に auto-save をスキップするオプションを追加する
  - オプションが有効な場合、エディタ変更時にファイル書き込みデバウンスをスキップする
  - プレビュー更新と dirty 状態管理は通常通り動作させる
  - _Requirements: 2.3, 6.1_

- [x] 4. TabBar UI の「+」ボタン追加
- [x] 4.1 (P) TabBar コンポーネントに+ボタンを追加
  - TabBar の右端に新規タブ作成ボタンを追加する
  - ダークテーマに調和するスタイリング（zinc カラーパレット）を適用する
  - 新規タブ作成のコールバック prop を受け取る
  - タブ数が最大に達した場合はボタンを無効化する
  - タブが 0 個でも TabBar を表示するように Show 条件を変更する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. App.tsx の統合
- [x] 5.1 untitled タブ作成フローの統合
  - TabBar の+ボタンクリックで tabStore の untitled タブ作成を呼び出す
  - untitled タブ作成後に viewMode を preview に設定する
  - TabBar に最大タブ数フラグと新規タブコールバックを渡す
  - _Requirements: 1.1, 5.3_

- [x] 5.2 edit モードガードの変更
  - untitled タブでも edit / split モードに入れるようにガード条件を修正する
  - buffer モード（stdin/clipboard/url）のガードは維持する
  - untitled タブ用に SyncEngine を auto-save スキップモードで生成する
  - _Requirements: 2.1, 6.1, 6.2_

- [x] 5.3 Save As フローの実装
  - untitled タブで :w 実行時に OS ネイティブの保存ダイアログを表示する
  - ユーザーがパスを選択したらファイルを書き込み、タブを file モードに昇格する
  - 昇格後に SyncEngine を通常の auto-save モードで再生成する
  - 昇格後に file watcher を開始し、ウィンドウタイトルを更新する
  - ダイアログがキャンセルされた場合は何も変更しない
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.3_

- [x] 5.4 untitled タブの閉じる操作
  - 変更済み untitled タブを閉じる際に破棄確認ダイアログを表示する
  - ユーザーが破棄を選択したらタブを閉じて内容を破棄する
  - キャンセル選択時はタブを維持する
  - 未変更 untitled タブは確認なしで閉じる
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.5 タブ切替時の fileWatcher スキップ
  - アクティブタブ変更時の effect で untitled タブの場合は fileWatcher.watch をスキップする
  - _Requirements: 6.2_
