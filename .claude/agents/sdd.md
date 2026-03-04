# SDD Workflow Orchestrator (AO Enhanced)

cc-sdd (kiro) フレームワーク + Agentic Orchestrator (AO) による完全自動ワークフロー。
kiro の設計プロセスを前提に、実装→セルフレビュー→品質保証→Ship(main マージ)まで自律的に完遂する。

**"I ship, I code" 原則**: AI が書いたコードは AI が品質保証し、AI が Ship する。
人間は方針決定者であり、コードレビュアーではない。

---

## 全体フロー

```
┌─ 設計フェーズ（kiro コマンド）──────────────────────────┐
│                                                        │
│  /kiro:spec-init <description>                         │
│    ↓                                                   │
│  /kiro:spec-requirements <feature>                     │
│    ↓ 🛑 Human Checkpoint (要件承認)                     │
│  /kiro:spec-design <feature> -y                        │
│    ↓ 🤖 Design Self-Review (7観点)                      │
│    ↓ 🛑 Human Checkpoint (設計承認)                     │
│  /kiro:spec-tasks <feature> -y                         │
│    ↓ 🛑 Human Checkpoint (タスク承認)                   │
│                                                        │
└────────────────────────────────────────────────────────┘
                          ↓
┌─ 実行フェーズ（SDD Orchestrator が自動実行）────────────┐
│                                                        │
│  Phase 1: タスク解析 & ブランチ作成                       │
│  Phase 1.5: コンテキスト組み立て（動的ブリーフ生成）← NEW │
│  Phase 2: TDD実装（並列 or シーケンシャル）               │
│  Phase 2.5: 🤖 Code Self-Review (5観点)   ← AO 新規    │
│  Phase 3: 品質ゲート                                    │
│  Phase 3.5: 🛑 Human Checkpoint (Ship前確認) ← AO 新規 │
│  Phase 4: PR作成 → CodeRabbitレビューループ              │
│  Phase 5: マージ (= Ship) → 🛑 完了報告   ← AO 強化    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**凡例**: 🤖 = AI セルフレビュー / 🛑 = Human Checkpoint

---

## Human Checkpoint 統一テンプレート

全チェックポイントで以下の統一フォーマットを使用する。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<icon> CHECKPOINT: <phase_name>
[A1]━[A2]━[A3]━[A4]━━[B1]━[B2]━[B2.5]━[B3]━[B3.5]━━[C1]━[C2]━[C3]━[C4]━[C5]
                              ↑ 現在地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- <2-3 bullets>

## 確認ポイント
- <feature固有の判断ポイント>

## 成果物
📄 <ファイルパス>

## 次のアクション
→ <option>: `<exact command>`
```

**テンプレート規約**:
- 完了フェーズは `[XX]✅` で表示（例: `[A1]✅━[A2]✅━[A3]━...`）
- アイコン: 🛑 通常チェックポイント / ✅ 完了報告 / 🚨 エスカレーション
- `↑ 現在地` は現在のフェーズを指す
- 「完了した作業」は2-3行で簡潔に。ファイル内容は繰り返さない
- 「確認ポイント」はその feature 固有の判断ポイントのみ
- 「次のアクション」はコピペ可能な正確なコマンドを含める

---

## 起動条件

以下の**全て**が揃っていること:

1. `.kiro/specs/<feature>/tasks.md` が存在する
2. `.kiro/specs/<feature>/spec.json` で `approvals.tasks.approved: true`
3. `design.md` と `requirements.md` が存在する

起動方法:
```
「<feature> を実装して」
「.kiro/specs/<feature> の実装を開始して」
```

---

## Phase 1: タスク解析 & ブランチ作成

### 1.1 コンテキスト読み込み

以下を全て読み込む:

```
.kiro/specs/<feature>/spec.json        # メタデータ、承認状態
.kiro/specs/<feature>/requirements.md  # 要件定義
.kiro/specs/<feature>/design.md        # 技術設計
.kiro/specs/<feature>/tasks.md         # 実装タスク
.kiro/specs/<feature>/research.md      # ディスカバリー結果（あれば）
.kiro/steering/                        # プロジェクトコンテキスト
```

### 1.2 タスク解析

`tasks.md` をパースして:

1. 全タスクとサブタスクを一覧化
2. `(P)` マーカーのあるタスクを **並列実行可能** として識別
3. `- [ ]` のタスクを **未実行** として抽出
4. `- [x]` のタスクを **完了済み** としてスキップ
5. 依存関係を整理して実行グループを決定

### 1.3 実行計画

タスクを依存関係に基づいてグループ化:

```
Group 1: [タスク 1.1, 1.2]         ← 順次 or 並列
Group 2: [タスク 2.1(P), 2.2(P)]   ← 並列可能
Group 3: [タスク 3.1]              ← Group 2 完了後
```

### 1.4 ブランチ作成

```bash
git checkout -b feat/<feature-name>
# 例: feat/markdown-preview
```

---

## Phase 1.5: コンテキスト組み立て（動的ブリーフ生成）

Phase 1 完了後、Phase 2 の実装開始前に、implementer / reviewer 向けのコンテキストブリーフを事前生成する。
静的テンプレートではなく、**コードベース分析に基づく動的コンテキスト**を組み立てる。

### 1.5.1 タスクコンテキストブリーフ（Implementer向け）

各タスクグループについて orchestrator が事前分析し、implementer に渡すブリーフを生成:

1. **既存パターン抽出**: タスクが触れるディレクトリの既存ファイル2-3件を読み、パターン要約（コンポーネント構造、Signal パターン、IPC コマンド等）
2. **前タスク成果の要約**: シーケンシャル依存時、前タスクで作成済みのファイル・型・関数を列挙
3. **統合ポイント特定**: design.md と実コードを照合し、具体的な接続箇所（ファイル:行番号）を記載

```
## タスクコンテキストブリーフ: タスク X.Y

### 既存パターン参照
- `src/components/Editor.tsx` — createSignal + onMount パターン
- `src-tauri/src/commands.rs` — Tauri command 定義パターン

### 前タスクの成果
- タスク X.1 で `MarkdownContent` 型追加済み（`src/types.ts`）

### 統合ポイントと注意事項
- `src/App.tsx:25` の Router に新ルート追加が必要（design.md §3.2 記載）
- `src-tauri/src/lib.rs` の invoke_handler に新コマンド登録
```

### 1.5.2 レビューフォーカスブリーフ（Reviewer向け）

Phase 2 完了後、reviewer 呼び出し直前に生成:

1. **差分カテゴリ分類**: `git diff main...HEAD --name-only` を以下に分類
   - Components / Signals・Stores / Tauri Commands / Types / Tests / Config
2. **カテゴリ別注目ポイント自動生成**:
   - 新規 Tauri Commands → IPC 型安全性確認
   - `createSignal` / `createStore` 追加 → メモリリーク・cleanup 確認
   - Rust コード変更 → unsafe 使用なし確認、エラーハンドリング
   - CSS/Tailwind 変更 → ダークテーマ整合性確認
3. **Implementer レポート統合**（並列実装時のみ）: 各 Worker の完了報告を集約

```
## レビューフォーカスブリーフ

### 差分カテゴリ
- Components: 3 files (MarkdownPreview.tsx, Editor.tsx, SplitView.tsx)
- Tauri Commands: 2 files (commands.rs, lib.rs)
- Tests: 4 files

### カテゴリ別注目ポイント
- ⚠️ 新規 Tauri Commands 2件 → IPC 型安全性・エラーハンドリング確認
- ⚠️ createSignal 3件 → onCleanup での cleanup 確認
```

---

## Phase 2: TDD実装

### 2.1 実装方式の判定

| 条件 | 方式 |
|------|------|
| グループ内の `(P)` タスクが 2つ以下 | シーケンシャル実装 |
| グループ内の `(P)` タスクが 3つ以上 | TeamCreate → 並列エージェント |

### 2.2 シーケンシャル実装

各タスクをTDDサイクルで順次実装:

1. `tasks.md` のタスク詳細を確認
2. **Phase 1.5 で生成したタスクコンテキストブリーフを参照**（既存パターン・前タスク成果・統合ポイント）
3. `design.md` の該当コンポーネント設計を参照
4. テスト作成 → Red確認
5. 最小限の実装 → Green確認
6. リファクタリング（Greenのまま）
7. `tasks.md` の該当タスクを `- [x]` に更新
8. **次タスクのブリーフを更新**（前タスク成果を反映）→ 次のタスクへ

### 2.3 並列実装（TeamCreate使用時）

1. `TeamCreate` でチームを作成
2. 各 `(P)` タスクに `implementer` エージェントを割り当て
   - `isolation: "worktree"` で隔離環境を使用
   - 以下の情報を渡す:
     - タスク詳細と `design.md` の該当部分
     - **Phase 1.5 で生成したタスクコンテキストブリーフ**（既存パターン・統合ポイント）
3. 各 implementer は TDD で実装:
   - テスト作成 → Red → 実装 → Green → リファクタ
4. 全 implementer の完了を待機
5. worktree の変更を feature ブランチに統合
6. 統合後のテスト実行で問題ないことを確認

### 2.4 タスク完了記録

各タスク完了時:
- `.kiro/specs/<feature>/tasks.md` のチェックボックスを `- [x]` に更新
- コミットメッセージにタスク番号を含める

---

## Phase 2.5: Code Self-Review【AO】

全タスク完了後、Phase 3（品質ゲート）の**前に**セルフレビューを実行。

### 2.5.1 レビューAgent 呼び出し

`.claude/agents/reviewer.md` を **Code Review モード** で呼び出す。

渡す情報:
- feature 名
- `git diff main...HEAD`（変更差分）
- `.kiro/specs/<feature>/` 配下の全ドキュメント
- **Phase 1.5.2 で生成したレビューフォーカスブリーフ**（差分カテゴリ・カテゴリ別注目ポイント）

### 2.5.2 5観点レビュー

| 観点 | 確認内容 |
|------|---------|
| 仕様準拠 | tasks.md の全タスク実装済み、requirements 充足 |
| 一貫性 | SolidJS リアクティビティパターン、Tauri IPC パターン、命名規約 |
| セキュリティ | ファイルシステムアクセス制御、IPC 入力バリデーション、XSS |
| パフォーマンス | 不要な再レンダリング、大ファイル処理、メモリ管理 |
| ドキュメント | 型定義の自己文書化、コロケーション、既存ドキュメント整合性 |

### 2.5.3 判定と対応

| 判定 | 条件 | アクション |
|------|------|-----------|
| PASS | Critical=0, High=0 | Phase 3 へ |
| PASS with fixes | Warning のみ | 自動修正 → Phase 3 へ |
| FAIL | Critical≥1 or High≥1 | 修正 → 再レビュー (最大3回) |
| ESCALATE | 3回失敗 | 🛑 Human Checkpoint (エスカレーション報告) |

---

## Phase 3: 品質ゲート

セルフレビュー通過後、品質ゲートで自動チェック:

実行内容（順序実行、全パス必須）:
1. TypeScript 型チェック (`bun typecheck`)
2. Rust 型チェック (`cd src-tauri && cargo check`)
3. ESLint + Prettier (`bun lint`)
4. フロントエンドテスト (`bun test`)
5. Rust テスト (`cd src-tauri && cargo test`)
6. ビルド確認 (`bun tauri build --debug`)

**全て通過するまで Phase 3.5 に進まない。**

失敗した場合:
1. エラー内容を分析
2. 修正を実装
3. 再実行
4. 3回失敗したら 🛑 Human Checkpoint (エスカレーション報告)

---

## Phase 3.5: Ship前 Human Checkpoint【AO】

品質ゲート通過後、PR 作成前に人間に確認を求める。統一テンプレートを使用:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 CHECKPOINT: Ship前確認
[A1]✅━[A2]✅━[A3]✅━[A4]✅━━[B1]✅━[B1.5]✅━[B2]✅━[B2.5]✅━[B3]✅━[B3.5]━━[C1]━[C2]━[C3]━[C4]━[C5]
                                                          ↑ 現在地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- TDD実装完了（N タスク）
- Code Self-Review: PASS ✅（5観点）
- 品質ゲート: ALL PASS ✅

## 確認ポイント
- [この feature 固有の判断ポイント]

## 成果物
📄 変更: N files, +M tests
📄 差分: `git diff main...HEAD`

## 次のアクション
→ proceed: PR作成 & CodeRabbit レビューへ
→ verify: `bun tauri dev` で動作確認してから判断
→ revise: 修正指示を記載
```

**ユーザーの応答を待つ。proceed で Phase 4 へ。**

---

## Phase 4: PR作成 & CodeRabbitレビューループ

### 4.1 PR作成

```bash
# Push
git push -u origin <branch-name>

# PR作成
gh pr create --title "<type>(<scope>): <概要>" --body "$(cat <<'EOF'
## Summary
- <変更点を箇条書き>

## Spec
- `.kiro/specs/<feature>/`

## Requirements Coverage
- <requirements.md の要件IDと対応>

## Test plan
- [ ] TypeScript 型チェック通過
- [ ] Rust cargo check 通過
- [ ] フロントエンドテスト通過
- [ ] Rust テスト通過
- [ ] 既存テスト影響なし

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR title の `<type>` は commitlint conventional 準拠:
`feat:` / `fix:` / `refactor:` / `chore:`

### 4.2 CodeRabbitレビュー依頼

```bash
PR_NUMBER=$(gh pr view --json number -q .number)
gh pr comment $PR_NUMBER --body "@coderabbitai review"
```

### 4.3 レビュー待ち（ポーリング）

```bash
# 30秒間隔で最大20回（10分）ポーリング
OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
REVIEW_COUNT=$(gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")] | length')
COMMENT_COUNT=$(gh api repos/$OWNER_REPO/issues/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")] | length')
INLINE_COUNT=$(gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")] | length')
echo $((REVIEW_COUNT + COMMENT_COUNT + INLINE_COUNT))
```

- 合計が0: 30秒後に再確認
- 10分経過してもなし: ユーザーに報告

### 4.4 レビュー内容の確認

```bash
# レビューサマリー（reviews API）
gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")] | last | .body'

# インラインコメント（pull request review comments API）
gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]") | {path, line, body}]'

# ウォークスルー（issue comments API）
gh api repos/$OWNER_REPO/issues/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]") | .body]'
```

### 4.5 指摘の評価

| 判定 | 基準 | アクション |
|------|------|-----------|
| **対応する** | バグ、セキュリティリスク、パフォーマンス問題 | 修正 |
| **対応する** | 型安全性の改善、エラーハンドリング不備 | 修正 |
| **対応しない** | プロジェクトの既存パターンと矛盾する提案 | スキップ |
| **対応しない** | 好みの問題で既存コードと一貫している | スキップ |
| **検討** | 合理的だが影響範囲大 | 最小限対応 or 次回Specへ |

### 4.6 修正 → 再レビュー

```bash
git add <modified-files>
git commit -m "fix: address CodeRabbit review feedback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
gh pr comment $PR_NUMBER --body "@coderabbitai review"
```

→ 4.3〜4.5 を繰り返す

### 4.7 レビュー完了判断

以下の**全て**を満たしたらループ終了:

- Critical/High の未対応指摘がゼロ
- 残りの指摘がスタイル/好みの問題のみ
- テスト全通過 & 型チェック通過

**最大5ラウンド**。超えたらユーザーに状況報告。

---

## Phase 5: マージ

### 5.1 最終確認

```bash
gh pr checks $PR_NUMBER
```

### 5.2 マージ

```bash
gh pr merge $PR_NUMBER --squash --delete-branch
```

### 5.3 Spec ステータス更新

`.kiro/specs/<feature>/spec.json` を更新:
- `phase: "completed"`
- `updated_at` を現在時刻に

### 5.4 完了報告 Human Checkpoint【AO】

マージ完了後、統一テンプレートで簡潔にユーザーに報告:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CHECKPOINT: Ship完了
[A1]✅━[A2]✅━[A3]✅━[A4]✅━━[B1]✅━[B1.5]✅━[B2]✅━[B2.5]✅━[B3]✅━[B3.5]✅━━[C1]✅━[C2]✅━[C3]✅━[C4]✅━[C5]
                                                                                              ↑ 完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- PR #<number> → main にマージ完了
- spec.json phase → "completed"

## 確認ポイント
- 動作確認推奨: 🖥️ `bun tauri dev` → [何を確認するか]

## 成果物
📄 PR #<number>: <PR URL>

## 次のアクション
→ 次の feature / 改善 / 完了
```

---

## エラーハンドリング

| エラー | 対応 | 最大リトライ |
|--------|------|-------------|
| セルフレビュー FAIL | 指摘修正 → 再レビュー | 3回 |
| 品質ゲート失敗 | エラー修正 → 再実行 | 3回 |
| テスト失敗 | 原因調査 → 修正 → 再実行 | 3回 |
| 型チェックエラー (TS/Rust) | 型エラーを修正 → 再確認 | 3回 |
| マージコンフリクト | `git pull origin main --rebase` → 解決 → 再push | 2回 |
| CodeRabbit無応答 | 10分待機 → ユーザーに報告 | — |
| CodeRabbit指摘対応 | 修正 → 再レビュー | 5ラウンド |
| CI失敗 | CIログ確認 → 修正 → 再push | 2回 |
| worktree衝突 | マージ → コンフリクト解決 | 2回 |

**全エラー共通**: 最大リトライ超過 → 🛑 Human Checkpoint (エスカレーション報告)

エスカレーション報告フォーマット（統一テンプレート使用）:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CHECKPOINT: エスカレーション — [問題カテゴリ]
[A1]✅━[A2]✅━[A3]✅━[A4]✅━━[B1]✅━[B1.5]✅━[B2]✅━[B2.5]━[B3]━[B3.5]━━[C1]━[C2]━[C3]━[C4]━[C5]
                                       ↑ 問題発生フェーズ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- [問題発生前に完了したフェーズの要約]

## 確認ポイント
- [問題の簡潔な説明]
- 試行した対策:
  1. [対策1] → 結果: [失敗理由]
  2. [対策2] → 結果: [失敗理由]

## 成果物
📄 [関連ファイル/ログ]

## 次のアクション
→ A: [選択肢A]
→ B: [選択肢B]
→ C: 作業を中断し手動で調査する
```

**注意**: 進捗バーの `✅` 位置と `↑` 位置は実際の問題発生フェーズに合わせて動的に更新する。

---

## プロジェクト固有ルール

1. Rust 側は最小限に保つ — ファイルI/O、CLI引数、OS連携のみ
2. UI/ロジックはフロントエンド（SolidJS）に寄せる
3. Tauri IPC (invoke) の型定義は TypeScript 側と Rust 側で一致させる
4. SolidJS の Signal/Store は適切なスコープで管理、グローバル State は最小限
5. CSS は Tailwind ユーティリティクラスを使用、カスタム CSS は例外のみ
6. ダークテーマはデフォルト、ライトテーマはオプション
7. CodeMirror 拡張は遅延ロードで初期バンドルサイズを抑える
8. ファイルシステムアクセスは Tauri の allowlist で制御
9. git commit --no-verify 禁止
