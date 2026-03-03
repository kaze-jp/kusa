# Requirements Document

## Introduction
外部ツール（Claude Code、Vim等）がMarkdownファイルを変更した際に、kusaのプレビューを自動リロードする機能。ターミナルAI開発者がファイルを編集しながら、kusaをリアルタイムプレビューとして使用できる体験を実現する。

## Requirements

### Requirement 1: ファイル変更検知
**Objective:** ターミナルAI開発者として、外部エディタでMarkdownファイルを変更した際にプレビューが自動更新されてほしい。手動リロードなしでリアルタイムプレビューを得るため。

#### Acceptance Criteria
1. When ファイルが外部から変更された場合, kusa shall 変更を検知しプレビューを自動更新する
2. When 連続して高速な変更が発生した場合, kusa shall 300msのデバウンスでまとめて1回の更新を行う
3. The kusa shall ウィンドウが非アクティブでもファイル監視を継続する

### Requirement 2: ファイル削除ハンドリング
**Objective:** ターミナルAI開発者として、監視中のファイルが削除された場合にエラー表示を見たい。ファイルの状態を把握するため。

#### Acceptance Criteria
1. When 監視中のファイルが削除された場合, kusa shall file-deleted イベントをフロントエンドに発行する
2. When ファイル削除イベントを受信した場合, フロントエンド shall ユーザーに通知を表示する

### Requirement 3: 編集中の外部変更衝突
**Objective:** ターミナルAI開発者として、kusa内で編集中にファイルが外部変更された場合に警告を受けたい。データ損失を防ぐため。

#### Acceptance Criteria
1. When エディタが未保存の変更を持つ状態で外部変更を検知した場合, kusa shall 衝突警告を表示する
2. When 衝突警告が表示された場合, ユーザー shall 外部変更の適用またはローカル変更の維持を選択できる

### Requirement 4: ウォッチライフサイクル管理
**Objective:** ファイルの開閉に応じてウォッチの開始・停止を適切に管理し、リソースリークを防ぐ。

#### Acceptance Criteria
1. When ファイルが開かれた場合, kusa shall 自動的にファイル監視を開始する
2. When 別のファイルに切り替えた場合, kusa shall 前のファイルの監視を停止し新しいファイルの監視を開始する
3. When アプリケーションが終了する場合, kusa shall すべてのファイル監視を停止する
