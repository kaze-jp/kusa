# Requirements Document

## Introduction
kusaの「Document Search」機能の要件定義。ターミナルAI開発者が長いMarkdownドキュメント内でテキスト検索を行い、目的の箇所に素早くアクセスできるインクリメンタルサーチ体験を提供する。Cmd+F / Ctrl+F でサーチバーを起動し、リアルタイムでマッチをハイライトしながらナビゲーションできる。Vim `/` キーからも起動可能。

## Requirements

### Requirement 1: サーチバーUI
**Objective:** ターミナルAI開発者として、Cmd+F でサーチバーを表示したい。ドキュメント内のテキストを素早く検索するため。

#### Acceptance Criteria
1. When ユーザーが Cmd+F (macOS) / Ctrl+F を入力した場合, kusa shall プレビューエリア上部にサーチバーを表示する
2. The サーチバー shall テキスト入力フィールド、マッチ数表示（例: "3/12"）、前へ/次へボタン、閉じるボタンを含む
3. When サーチバーが表示された場合, kusa shall 入力フィールドに自動フォーカスする
4. When ユーザーが Esc キーを入力した場合, kusa shall サーチバーを閉じ、ハイライトをクリアする
5. The サーチバー shall ダークテーマに調和したデザインで表示する

### Requirement 2: インクリメンタルサーチ
**Objective:** ターミナルAI開発者として、入力中にリアルタイムで検索結果を確認したい。タイプするたびに結果が絞り込まれる体験のため。

#### Acceptance Criteria
1. While ユーザーがサーチバーに入力している間, kusa shall 入力内容に一致するすべてのテキストをプレビュー内でハイライト表示する
2. The kusa shall 最初のマッチ箇所を「現在のマッチ」として区別してハイライトする
3. When 検索テキストが変更された場合, kusa shall ハイライトをリアルタイムで更新する
4. When マッチが0件の場合, kusa shall マッチ数表示を "0/0" とし、ハイライトを表示しない
5. The kusa shall 大文字/小文字を区別しない検索をデフォルトとする

### Requirement 3: マッチナビゲーション
**Objective:** ターミナルAI開発者として、検索結果間を前後に移動したい。複数のマッチ箇所を効率的に確認するため。

#### Acceptance Criteria
1. When ユーザーが Enter を入力した場合, kusa shall 次のマッチ箇所にジャンプし、そのマッチを可視範囲にスクロールする
2. When ユーザーが Shift+Enter を入力した場合, kusa shall 前のマッチ箇所にジャンプする
3. When 最後のマッチで次へ移動した場合, kusa shall 最初のマッチにラップアラウンドする
4. When 最初のマッチで前へ移動した場合, kusa shall 最後のマッチにラップアラウンドする
5. The kusa shall 現在のマッチインデックスとマッチ総数を "N/M" 形式で表示する

### Requirement 4: Vimキーバインド連携
**Objective:** ターミナルAI開発者として、Vim `/` キーでも検索を起動したい。Vim操作に統一された体験のため。

#### Acceptance Criteria
1. When ユーザーがプレビューモードで `/` を入力した場合, kusa shall サーチバーを表示する
2. The `/` キー shall 入力フィールドやエディタにフォーカスがある場合は通常の `/` 入力として動作する
3. When サーチバーが既に表示されている場合, kusa shall `/` キーを無視する
