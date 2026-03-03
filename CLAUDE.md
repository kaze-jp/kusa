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
- [ ] Markdownファイルのプレビュー表示
- [ ] CodeMirror vim mode での編集
- [ ] Split view (エディター左 + プレビュー右)
- [ ] CLI起動 (`kusa file.md`)
- [ ] ファイルのドラッグ&ドロップ
- [ ] GitHub Flavored Markdown 対応
- [ ] ダークテーマ
- [ ] ファイル保存 (auto-save + manual)

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
