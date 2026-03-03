# Requirements Document

## Introduction
kusaの「Multi-File Tabs」機能の要件定義。ターミナルAI開発者がディレクトリモード(`kusa .`)で複数のMarkdownファイルをタブで開き、切り替えて閲覧・編集できる体験を実現する。ブラウザやVimのタブ操作に馴染みのあるショートカットでシームレスにファイル間を移動できる。

## Requirements

### Requirement 1: Tab Bar UI
**Objective:** ユーザーとして、開いているファイルをタブとして一覧表示したい。どのファイルが開いているか一目で把握するため。

#### Acceptance Criteria
1. When ファイルがタブとして開かれた場合, kusa shall コンテンツ領域の上部に水平タブバーを表示する
2. The kusa shall 各タブにファイル名と閉じるボタンを表示する
3. When タブがアクティブな場合, kusa shall 視覚的にハイライトして他のタブと区別する
4. While 未保存の変更がある場合, kusa shall タブにダーティインジケーター(ドット)を表示する
5. When タブが多数ある場合, kusa shall 水平スクロールでオーバーフローを処理する

### Requirement 2: Tab Operations
**Objective:** ユーザーとして、タブを操作してファイルを切り替え・閉じたい。効率的にファイル間を移動するため。

#### Acceptance Criteria
1. When ユーザーがタブをクリックした場合, kusa shall そのタブのファイルをアクティブ表示に切り替える
2. When ユーザーがタブの閉じるボタンをクリックした場合, kusa shall そのタブを閉じる
3. When 最後のタブが閉じられた場合, kusa shall ファイルリスト表示に戻る
4. When Cmd+W が押された場合, kusa shall アクティブなタブを閉じる(タブが残っている限りウィンドウは閉じない)

### Requirement 3: Keyboard Shortcuts
**Objective:** ユーザーとして、キーボードだけでタブを操作したい。マウスなしで効率的に作業するため。

#### Acceptance Criteria
1. When Cmd+Shift+] が押された場合, kusa shall 次のタブに切り替える
2. When Cmd+Shift+[ が押された場合, kusa shall 前のタブに切り替える
3. When Cmd+1〜9 が押された場合, kusa shall 対応する番号のタブに直接切り替える
4. When Vim ノーマルモードで gt が入力された場合, kusa shall 次のタブに切り替える
5. When Vim ノーマルモードで gT が入力された場合, kusa shall 前のタブに切り替える

### Requirement 4: File List Integration
**Objective:** ユーザーとして、ファイルリストからファイルをタブとして開きたい。ディレクトリモードでスムーズにファイルを開くため。

#### Acceptance Criteria
1. When ファイルリストでファイルがクリックされた場合, kusa shall 新しいタブとしてファイルを開く
2. When 既に開いているファイルがクリックされた場合, kusa shall 既存のタブに切り替える(重複タブを作らない)
3. The kusa shall 最大タブ数を20に制限し、超過時はエラーメッセージを表示する

### Requirement 5: Tab State Management
**Objective:** ユーザーとして、タブ毎にスクロール位置や編集状態が保持されてほしい。タブ切替時に作業位置を失わないため。

#### Acceptance Criteria
1. When タブを切り替えた場合, kusa shall 各タブのスクロール位置を保持・復元する
2. The kusa shall 各タブの isDirty 状態を独立して管理する
3. When タブを切り替えた場合, kusa shall プレビュー内容をアクティブタブのファイルに切り替える
