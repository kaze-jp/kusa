# Technical Design: smart-tab-label

## Document Info
- Feature: smart-tab-label
- Status: Draft
- Created: 2026-03-13
- Requirements: ./requirements.md

## Architecture Overview

フロントエンドのみの変更。Rust バックエンドは変更なし。

```
tabStore.tabs (Signal<Tab[]>)
       ↓
computeTabLabels() — 純粋関数でラベルを計算
       ↓
tabLabels (derived Signal<Map<string, TabLabel>>)
       ↓
TabBar — TabLabel の prefix + fileName を表示
```

**方針**: Tab 型には手を入れず、表示用ラベルを derived signal として外部で計算する。tabStore はデータ管理に専念し、表示ロジックは分離する。

## Component Design

### Component: computeTabLabels
- **Purpose**: 開いているタブ一覧から、各タブの表示ラベル（ディレクトリ prefix + ファイル名）を計算する純粋関数
- **Location**: `src/lib/tabLabelResolver.ts` (新規)
- **Dependencies**: なし（純粋関数）
- **Interface**:

```typescript
interface TabLabel {
  /** ディレクトリ prefix（例: "src/components"）。不要なら空文字 */
  prefix: string;
  /** ファイル名（例: "README.md"） */
  fileName: string;
}

/**
 * タブ一覧から表示ラベルを計算する。
 * 同名ファイルが複数ある場合、最小限のディレクトリ prefix を付与して区別する。
 */
function computeTabLabels(tabs: Tab[]): Map<string, TabLabel>;
```

**アルゴリズム**:
1. filePath が空 or isUntitled のタブはスキップ（prefix: "", fileName: tab.fileName）
2. 残りを fileName でグループ化
3. グループサイズ 1 → prefix なし
4. グループサイズ 2+ → 各タブの filePath からディレクトリセグメントを逆順に取り出し、グループ内で全ラベルが一意になる最小の深さを求める

**最小区別アルゴリズム詳細**:
```
入力: ["/a/x/components/README.md", "/a/y/components/README.md", "/b/z/README.md"]
Step 1 (depth=1): ["components", "components", "z"] → 重複あり
Step 2 (depth=2): ["x/components", "y/components", "z"] → 全て一意 ✓
結果: prefix = ["x/components", "y/components", "z"]
```

ただし depth を増やすのはまだ重複しているタブだけに対して行う。既に一意なタブの depth は増やさない。

### Component: TabBar (既存・修正)
- **Purpose**: タブバー UI。ラベル表示部分を修正
- **Location**: `src/components/TabBar.tsx` (既存)
- **変更内容**:
  - props に `tabLabels: Accessor<Map<string, TabLabel>>` を追加
  - ファイル名表示部分で prefix がある場合は `<span class="text-zinc-500">prefix/</span><span>fileName</span>` のように2段階表示
  - タブ最大幅の truncate はラベル全体に適用

### Component: App (既存・修正)
- **Purpose**: tabLabels derived signal を生成し TabBar に渡す
- **Location**: `src/App.tsx` (既存)
- **変更内容**:
  - `computeTabLabels` をインポート
  - `const tabLabels = () => computeTabLabels(tabStore.tabs())` で derived signal を作成
  - TabBar に `tabLabels` prop を追加

## API Contracts

### computeTabLabels

- **Signature**: `computeTabLabels(tabs: Tab[]): Map<string, TabLabel>`
- **Input**: `tabs` — Tab 配列。各 Tab は `id`, `filePath`, `fileName`, `isUntitled` を持つ
- **Output**: `Map<string, TabLabel>` — key は tab.id、value は表示用ラベル
- **Errors**: なし（純粋関数、常に結果を返す）
- **Example**:
```typescript
const tabs = [
  { id: "/projects/a/README.md", filePath: "/projects/a/README.md", fileName: "README.md", isUntitled: false },
  { id: "/projects/b/README.md", filePath: "/projects/b/README.md", fileName: "README.md", isUntitled: false },
  { id: "/projects/a/CLAUDE.md", filePath: "/projects/a/CLAUDE.md", fileName: "CLAUDE.md", isUntitled: false },
];

const labels = computeTabLabels(tabs);
// Map {
//   "/projects/a/README.md" => { prefix: "a", fileName: "README.md" },
//   "/projects/b/README.md" => { prefix: "b", fileName: "README.md" },
//   "/projects/a/CLAUDE.md" => { prefix: "", fileName: "CLAUDE.md" },
// }
```

## Data Models

### TabLabel
- **Fields**:
  - `prefix: string` — 表示用ディレクトリ prefix。不要なら空文字
  - `fileName: string` — ファイル名
- **Validation**: なし（computeTabLabels が正しく生成する）
- **Relationships**: Tab.id をキーとして Map で紐づく

### Tab (既存・変更なし)
既存の Tab interface は変更しない。表示ロジックは外部で計算する。

## State Management

```
tabs Signal (tabStore)
  ↓ リアクティブ依存
computeTabLabels(tabs()) — 純粋関数（derived signal として App で呼び出し）
  ↓ props
TabBar — prefix + fileName を描画
```

- タブの開閉・promote 時に tabs Signal が更新される
- tabs が更新されると computeTabLabels が自動再計算される（SolidJS の細粒度リアクティビティ）
- 明示的なイベントハンドリングやコールバックは不要

## Error Handling Strategy

エラーが起きるシナリオがほぼない:
- filePath が空 → prefix なしで fileName をそのまま返す
- filePath がパース不能な形式 → fileName をそのまま返す（フォールバック）

## Testing Strategy

### Unit Tests (`src/lib/tabLabelResolver.test.ts`)
- 全タブが一意のファイル名 → 全て prefix なし
- 2つの同名ファイル → 親ディレクトリで区別
- 3つの同名ファイル（うち2つが同じ親ディレクトリ） → 重複タブのみ depth を増やす
- untitled タブ → prefix なし
- クリップボードタブ → prefix なし
- filePath が空 → prefix なし
- タブ1つだけ → prefix なし
- 0タブ → 空 Map

### Integration Tests
- TabBar に tabLabels を渡して正しく描画されることを確認（コンポーネントテスト）

## Security Considerations

- フロントエンドのみの変更でファイルシステムアクセスなし
- filePath を innerHTML に入れない（XSS 防止）— textContent として表示

## Requirements Traceability

| Requirement | Design Component |
|-------------|-----------------|
| FR-001 | computeTabLabels (depth=1 で区別) |
| FR-002 | computeTabLabels (depth を段階的に増加) |
| FR-003 | computeTabLabels (グループサイズ 1 → prefix なし) |
| FR-004 | computeTabLabels (セパレーター `/`) + TabBar 表示 |
| FR-010 | SolidJS リアクティビティ (tabs Signal 更新で自動再計算) |
| FR-011 | SolidJS リアクティビティ (tabs Signal 更新で自動再計算) |
| FR-012 | SolidJS リアクティビティ (tabs Signal 更新で自動再計算) |
| FR-020 | computeTabLabels (isUntitled チェック) |
| FR-021 | computeTabLabels (isUntitled チェック) |
| FR-022 | computeTabLabels (filePath 空チェック) |
| FR-030 | computeTabLabels アルゴリズムで保証 |
| FR-031 | computeTabLabels (グループサイズ 1) |
| FR-032 | computeTabLabels (パスセグメント処理) |
| NFR-001 | 純粋関数・O(n) アルゴリズム・20タブ上限 |
| NFR-010 | TabBar — prefix を zinc-500 で表示 |
| NFR-011 | TabBar — fileName は既存色を維持 |
| NFR-012 | TabBar — truncate をラベル全体に適用 |
