# Requirements Document

## Introduction
kusa の UI 上に「+」ボタンを配置し、ローカルファイルが存在しなくても新規 untitled バッファを作成・編集・プレビューできる機能。GitHubからのコピペや一時的なMarkdown作成に対応し、必要に応じて Save As でローカル保存、保存後は通常の file モードに昇格する。

## Requirements

### Requirement 1: Untitled バッファの作成
**Objective:** ユーザーとして、UIから新規の空バッファを即座に作成したい。ローカルにファイルがなくてもMarkdownを書き始められるようにするため。

#### Acceptance Criteria
1. When ユーザーが TabBar の「+」ボタンをクリックした時, kusa shall 新しい untitled タブを空のコンテンツで作成し、アクティブタブとして表示する
2. kusa shall untitled タブに連番の名前を付与する（例: "Untitled-1", "Untitled-2"）
3. When 複数の untitled タブが既に存在する時, kusa shall 重複しない連番を生成する
4. kusa shall untitled タブを最大タブ数（20）の制限に含める

### Requirement 2: Untitled バッファの編集・プレビュー
**Objective:** ユーザーとして、untitled バッファでも通常のファイルと同様に edit / split / preview モードを使いたい。コピペした内容をすぐに整形・確認できるようにするため。

#### Acceptance Criteria
1. While untitled タブがアクティブな間, kusa shall preview / edit / split の全モード切替を許可する
2. While untitled タブが edit または split モードの間, kusa shall CodeMirror エディタを vim keybindings 付きで表示する
3. When untitled タブのエディタ内容が変更された時, kusa shall プレビューをリアルタイムに更新する（sync engine 経由）
4. When untitled タブのエディタ内容が変更された時, kusa shall タブに isDirty インジケーターを表示する

### Requirement 3: Save As によるローカル保存
**Objective:** ユーザーとして、untitled バッファの内容を任意のパスにファイルとして保存したい。一時的な内容を永続化する選択肢を持つため。

#### Acceptance Criteria
1. When ユーザーが untitled タブで `:w` を実行した時, kusa shall OS ネイティブの保存ダイアログを表示し、保存先パスを選択させる
2. When ユーザーが保存先パスを選択した時, kusa shall ファイルをディスクに書き込む
3. When 保存が成功した時, kusa shall タブを file モードに昇格させる（filePath の設定、タブ名の更新、isDirty のクリア）
4. While タブが file モードに昇格した後, kusa shall auto-save および file watcher を通常通り有効にする
5. If ユーザーが保存ダイアログをキャンセルした時, kusa shall 何も変更せず untitled 状態を維持する

### Requirement 4: Untitled バッファの閉じる操作
**Objective:** ユーザーとして、保存せずにバッファを閉じることも、確認付きで閉じることもしたい。作業の消失を防ぎつつ、不要なバッファを簡単に破棄できるようにするため。

#### Acceptance Criteria
1. When ユーザーが未変更の untitled タブを閉じた時, kusa shall 確認なしで即座にタブを閉じる
2. When ユーザーが変更済み（isDirty）の untitled タブを閉じた時, kusa shall 破棄確認ダイアログを表示する
3. When ユーザーが確認ダイアログで「破棄」を選択した時, kusa shall タブを閉じてバッファ内容を破棄する
4. When ユーザーが確認ダイアログで「キャンセル」を選択した時, kusa shall タブを閉じずに維持する

### Requirement 5: TabBar UI の「+」ボタン
**Objective:** ユーザーとして、既存の TabBar に自然に統合された新規バッファ作成ボタンが欲しい。直感的に発見・操作できるようにするため。

#### Acceptance Criteria
1. kusa shall TabBar の右端に「+」ボタンを常時表示する
2. kusa shall 「+」ボタンを既存タブのスタイルと調和するデザインで表示する（ダークテーマ対応）
3. When タブが0個の状態で「+」ボタンがクリックされた時, kusa shall TabBar を表示して untitled タブを作成する
4. While タブ数が最大（20）に達している間, kusa shall 「+」ボタンを無効化する

### Requirement 6: Auto-save の抑制
**Objective:** ユーザーとして、untitled バッファが自動保存されないことを保証したい。保存先が未決定の内容が意図せずディスクに書き込まれることを防ぐため。

#### Acceptance Criteria
1. While タブが untitled 状態の間, kusa shall auto-save を無効にする（sync engine のファイル書き込みをスキップ）
2. While タブが untitled 状態の間, kusa shall file watcher を起動しない
3. When untitled タブが file モードに昇格した時, kusa shall auto-save を有効にして sync engine を通常動作に切り替える
