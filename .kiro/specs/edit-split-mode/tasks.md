# Implementation Plan

## Requirements Coverage

| Requirement | Task |
|-------------|------|
| 1.1 | 2.1 |
| 1.2 | 2.2 |
| 1.3 | 2.1 |
| 1.4 | 2.2 |
| 1.5 | 2.1, 2.2 |
| 1.6 | 2.1 |
| 2.1 | 1.1 |
| 2.2 | 1.2 |
| 2.3 | 1.2 |
| 2.4 | 1.2 |
| 2.5 | 1.2 |
| 2.6 | 2.2 |
| 2.7 | 2.2 |
| 3.1 | 1.3 |
| 3.2 | 1.3 |
| 3.3 | 1.3 |
| 3.4 | 1.3 |
| 3.5 | 1.3 |
| 4.1 | 1.2, 1.3 |
| 4.2 | 2.2 |
| 4.3 | 2.2 |
| 4.4 | 1.1 |
| 5.1 | 3.1 |
| 5.2 | 3.1 |
| 5.3 | 3.1 |
| 5.4 | 3.1 |

## Tasks

- [x] 1. Edit/Split モードの状態管理と UI ルーティングを追加する
- [x] 1.1 editMode signal とエディタ状態の signal を App に追加する
  - サブモード signal（preview / edit / split）を作成し、AppViewMode とは独立に管理する
  - Vim モード、カーソル位置、dirty フラグ、保存通知の各 signal を追加する
  - EditorLazyLoader を App レベルで初期化し、モジュールキャッシュを保持する
  - CodeMirror ロード失敗時に Preview を維持しエラー通知を表示するフォールバックを実装する
  - _Requirements: 2.1, 4.4_

- [x] 1.2 Edit モードのコンテンツ表示を App に組み込む
  - EditorPane と StatusBar を使った EditContent コンポーネントを App 内部に定義する
  - SyncEngine を Edit モード開始時に作成し、エディタ内容変更をデバウンス付き自動保存に接続する
  - :w で即座保存、:wq で保存して Preview 復帰、:q で Preview 復帰のハンドラを実装する
  - エディタインスタンスの参照を保持し、外部からの内容更新を可能にする
  - editMode が "edit" の場合に Switch 分岐で EditContent を表示する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1_

- [x] 1.3 Split モードのコンテンツ表示を App に組み込む
  - SplitLayout（左:EditorPane、右:Preview）と StatusBar を使った SplitContent コンポーネントを定義する
  - SyncEngine の onPreviewUpdate で右ペインの HTML を更新する（250ms デバウンス）
  - 自動保存（800ms デバウンス）を Edit モードと同じハンドラで接続する
  - editMode が "split" の場合に Switch 分岐で SplitContent を表示する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1_

- [x] 2. キーバインドによるモード切替を実装する
- [x] 2.1 Preview → Edit/Split への切替キーバインドを追加する
  - useVimNav に editMode accessor と onEnterEdit コールバックを追加し、edit/split 時はナビゲーションをスキップする
  - `i` キーで Edit モードに切り替える（ファイルが editable かつ preview モードの場合のみ）
  - `Ctrl+e` で Split モードに切り替える（同条件）
  - Buffer モード、file-list、error 状態ではモード切替を無効化する
  - CodeMirror モジュールの遅延ロードを切替前に実行し、ロード完了後にモードを変更する
  - _Requirements: 1.1, 1.3, 1.5, 1.6_

- [x] 2.2 Edit/Split → Preview への復帰キーバインドを追加する
  - NORMAL モードで Escape を押すと Preview に戻る（Vim mode polling で NORMAL 判定）
  - `Ctrl+e` を Edit/Split モードから押すと Preview に戻る
  - :wq コマンドで保存後に Preview に戻る
  - :q コマンドで Preview に戻る
  - 復帰時にエディタの最新内容で Markdown signal を更新し、プレビューを再レンダリングする
  - 未保存変更がある場合は復帰前に forceSave を実行する
  - SyncEngine を破棄する
  - _Requirements: 1.2, 1.4, 1.5, 2.6, 2.7, 4.2, 4.3_

- [x] 3. 既存機能との統合を確認し修正する
- [x] 3.1 タブ切替・ファイル監視・ドロップ・ショートカットとの統合を実装する
  - タブ切替時に Edit/Split モードのエディタ内容を新タブのコンテンツに更新する（SyncEngine も再作成）
  - 外部ファイル変更時に dirty でなければエディタ内容を自動リロードし、dirty の場合は通知のみ表示する
  - ファイルドロップ時に Preview モードに戻してから新タブを開く
  - Cmd+W（タブ閉じる）、Cmd+F（検索）、Ctrl+T（テーマ）、Ctrl+B（TOC）等の既存ショートカットを Edit モードでも動作させる
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. ビルド確認と手動動作テストを実行する
- [x] 4.1 TypeScript コンパイルとビルドが成功することを確認する
  - bun run build で型エラー・ビルドエラーがないことを確認する
  - bun run lint で既存の lint ルールに違反していないことを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1_
