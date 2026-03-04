# Requirements: Split Mode Scroll Sync

## Overview

Split modeでエディタ（CodeMirror）のカーソル位置に応じて、プレビュー（Markdown HTML）のスクロール位置を自動追従させる機能。

GitHub Issue: #46

## Functional Requirements

### FR-1: Source Line Attribution
**When** Markdownがレンダリングされるとき
**the system shall** ブロックレベル要素（見出し、段落、リスト、コードブロック、テーブル等）に `data-source-line` 属性としてソースMarkdownの行番号を付与する。

### FR-2: Editor-to-Preview Scroll Sync
**When** Split modeでエディタのカーソル位置が変更されたとき
**the system shall** カーソルのある行に対応するプレビュー要素を特定し、そのプレビュー要素が表示領域内に見えるようにスクロールする。

### FR-3: Initial Sync on Split Entry
**When** Preview modeからSplit mode (Ctrl+E) に切り替えたとき
**the system shall** 現在のプレビュースクロール位置に対応するエディタの行にカーソルを移動する（プレビュー位置を基準にエディタを同期）。

### FR-4: Debounced Sync
**When** カーソル位置が高頻度で変更されるとき
**the system shall** スクロール同期を100ms以下のdebounce間隔で実行し、UIのカクつきを防ぐ。

### FR-5: Sync Direction Control
**When** プレビュー側を手動スクロールしているとき
**the system shall** エディタ→プレビューの自動同期を一時停止し、ユーザーの手動スクロールを妨げない。3秒間カーソル移動がなければ自動同期を再開する。

## Non-Functional Requirements

### NFR-1: Performance
- スクロール同期の遅延は200ms以内
- `data-source-line` 属性の追加によるMarkdownレンダリングへの影響は10ms以内

### NFR-2: Compatibility
- 既存のPreview mode、Edit modeの動作に影響しないこと
- rehype-sanitize との互換性を維持すること（`data-source-line` のホワイトリスト追加）

### NFR-3: Scope
- 同期方向は **エディタ → プレビュー** を主とする（v1）
- プレビュー → エディタの逆方向同期はv2以降とする
