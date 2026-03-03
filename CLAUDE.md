# kusa - AI開発者のためのMarkdownエディター

## プロジェクト概要

AI開発時代にMarkdownを読む/書く/レビューする体験を再定義する、軽量・高速なMarkdownエディター&ビューワー。

### ビジョン

> "Ghosttyがターミナル体験を再定義したように、kusaがMarkdown体験を再定義する"

### ターゲットユーザー

- ターミナルAI開発者（Claude Code, Cursor CLI, Kiro CLI ユーザー）
- VS Codeを開かずに開発する層
- Markdown中心の開発ワークフロー（spec, plan, CLAUDE.md, AGENTS.md, PR review）

## 技術スタック

- **Frontend**: SolidJS + TypeScript
- **Backend**: Rust (Tauri v2)
- **Markdown**: unified/remark ecosystem
- **Editor**: CodeMirror 6 + vim extension
- **Styling**: Tailwind CSS
- **Build**: pnpm

## アーキテクチャ方針

- Tauri v2 でネイティブウィンドウ + WebView
- CLI起動: `kusa ./file.md` or `kusa .` (ディレクトリ)
- 軽量: Electron不使用、Chromium同梱なし
- 3つのモード: Preview / Edit / Split (プレビュー+エディタ並列)

## コアコンセプト

1. **Instant Open** — CLI引数、ファイルドロップ、パイプで即起動
2. **Vim-First** — CodeMirror vim mode。jk escape、Space leader
3. **Beautiful Preview** — GitHub風レンダリング + シンタックスハイライト
4. **AI Context Aware** — CLAUDE.md, AGENTS.md, .cursorrules のシンタックス対応
5. **Terminal Native** — Ghostty/Warp/iTerm のファイルリンクから起動

## MVP機能 (v0.1)

- Markdownファイルのプレビュー表示
- CodeMirror vim mode での編集
- Split view (エディター左 + プレビュー右)
- CLI起動 (`kusa file.md`)
- ファイルのドラッグ&ドロップ
- GitHub Flavored Markdown 対応
- ダークテーマ
- ファイル保存 (auto-save + manual)

## v0.2以降

- GitHub PR連携 (`kusa pr 123`)
- Diff表示 (2ファイル比較)
- AIコンテキストファイルのバリデーション
- 複数ファイルタブ
- ファイルツリー (オプショナル)
- カスタムテーマ
- mermaid / KaTeX 対応

## 開発ルール

- pnpm を使用
- コミットメッセージは Conventional Commits
- Rust側は最小限に保つ（ファイルI/O、CLI、OS連携のみ）
- UI/ロジックはなるべくフロントエンドに寄せる
- **実装は SDD フェーズ (Phase 1-5) に従う**
- **CodeRabbit レビュー必須（Phase 4）**
- `git commit --no-verify` 禁止

## SDD (Spec-Driven Development)

本プロジェクトは SDD ワークフローで開発する。

### ワークフロー概要

```
設計: /kiro:spec-init → /kiro:spec-requirements → /kiro:spec-design → /kiro:spec-tasks
実装: 「<feature>を実装して」 → Phase 1-5 自動実行 → Ship
```

### kiro コマンド一覧

| コマンド | 説明 |
|---------|------|
| `/kiro:spec-init <desc>` | Spec初期化 |
| `/kiro:spec-requirements <feature>` | 要件生成 (EARS形式) |
| `/kiro:spec-design <feature> [-y]` | 技術設計生成 |
| `/kiro:spec-tasks <feature> [-y]` | 実装タスク生成 |
| `/kiro:spec-impl <feature> [tasks]` | TDD実装実行 |
| `/kiro:spec-status [feature]` | 進捗確認 |
| `/kiro:validate-design <feature>` | 設計レビュー |
| `/kiro:validate-impl [feature]` | 実装バリデーション |
| `/kiro:validate-gap <feature>` | ギャップ分析 |
| `/kiro:steering` | ステアリング管理 |
| `/kiro:steering-custom` | カスタムステアリング作成 |

### ディレクトリ構造

```
.claude/agents/          — SDD エージェント (sdd.md, reviewer.md, implementer.md)
.claude/commands/kiro/   — kiro コマンド定義
.kiro/settings/rules/    — ルールファイル (EARS, 設計原則等)
.kiro/settings/templates/ — テンプレート (spec, steering)
.kiro/steering/          — プロジェクトメモリ (bootstrap後に生成)
.kiro/specs/             — 個別 feature の仕様書
```

### プロジェクト固有ルール

1. Rust 側は最小限 — ファイルI/O、CLI引数、OS連携のみ
2. UI/ロジックはフロントエンド（SolidJS）に寄せる
3. Tauri IPC の型定義は TypeScript 側と Rust 側で一致させる
4. Signal/Store は適切なスコープで管理、グローバル State は最小限
5. Tailwind ユーティリティクラスを使用、カスタム CSS は例外のみ
6. ダークテーマはデフォルト
7. CodeMirror 拡張は遅延ロードで初期バンドルサイズを抑える
8. ファイルシステムアクセスは Tauri の allowlist で制御
9. `git commit --no-verify` 禁止

