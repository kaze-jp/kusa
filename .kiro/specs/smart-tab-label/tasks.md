# Implementation Tasks: smart-tab-label

## Document Info
- Feature: smart-tab-label
- Total tasks: 3
- Parallelizable: 0（依存チェーンが直線的）
- Created: 2026-03-13

## Task Dependency Graph

```
T-001 → T-002 → T-003
```

## Parallel Execution Groups

全タスクが依存関係にあるため並列実行なし。ただし T-001 が小さいため全体の所要時間への影響は軽微。

## Tasks

### T-001: computeTabLabels 純粋関数 + テスト ✅
- **Description**: 開いているタブ一覧から表示用ラベル（prefix + fileName）を計算する純粋関数を作成する。同名ファイルには最小限のディレクトリ prefix を付与して区別する。テストファーストで実装する。
- **Files**:
  - `src/lib/tabLabelResolver.ts` (新規)
  - `src/lib/tabLabelResolver.test.ts` (新規)
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] 全タブが一意のファイル名 → 全て prefix 空文字
  - [ ] 同名ファイル2つ → 親ディレクトリで区別される
  - [ ] 同名ファイル3つ（うち2つが同じ親ディレクトリ） → 重複タブのみ depth が増える
  - [ ] untitled / clipboard / filePath 空 → prefix なし
  - [ ] タブ0個 → 空 Map
  - [ ] タブ1個 → prefix なし
- **Tests**: ユニットテスト（上記の全ケース）
- **Effort**: Small
- _Requirements: FR-001, FR-002, FR-003, FR-020, FR-021, FR-022, FR-030, FR-031, FR-032, NFR-001_

### T-002: TabBar に prefix 表示を統合 ✅
- **Description**: TabBar コンポーネントのファイル名表示部分を修正し、tabLabels prop から prefix を取得して表示する。prefix は zinc-500 で控えめに、fileName は既存色を維持する。truncate はラベル全体に適用する。
- **Files**:
  - `src/components/TabBar.tsx` (修正)
- **Dependencies**: T-001
- **Acceptance Criteria**:
  - [ ] prefix がある場合、ファイル名の前に薄い色で `prefix/` が表示される
  - [ ] prefix がない場合、ファイル名のみ表示（現状維持）
  - [ ] ラベル全体がタブ最大幅内で truncate される
  - [ ] ツールチップ（title 属性）は引き続きフルパスを表示する
- **Tests**: なし（ビジュアル確認）
- **Effort**: Small
- _Requirements: FR-004, NFR-010, NFR-011, NFR-012_

### T-003: App で derived signal を作成し TabBar に接続 ✅
- **Description**: App コンポーネントで computeTabLabels を呼び出す derived signal を作成し、TabBar に tabLabels prop として渡す。タブ開閉時に自動再計算されることを確認する。
- **Files**:
  - `src/App.tsx` (修正)
- **Dependencies**: T-002
- **Acceptance Criteria**:
  - [ ] 同名ファイルを2つ開くと、両方のタブに親ディレクトリが表示される
  - [ ] 片方を閉じると、残りのタブからディレクトリ表示が消える
  - [ ] untitled タブを開いてもディレクトリ表示に影響しない
  - [ ] promoteToFile 後にラベルが正しく再計算される
- **Tests**: 手動E2Eテスト
- **Effort**: Small
- _Requirements: FR-010, FR-011, FR-012_

## File Conflict Matrix

| Task | Files | Conflicts With |
|------|-------|---------------|
| T-001 | src/lib/tabLabelResolver.ts, src/lib/tabLabelResolver.test.ts | None |
| T-002 | src/components/TabBar.tsx | None |
| T-003 | src/App.tsx | None |

## Requirements Traceability

| Requirement | Tasks |
|-------------|-------|
| FR-001 | T-001 |
| FR-002 | T-001 |
| FR-003 | T-001 |
| FR-004 | T-002 |
| FR-010 | T-003 |
| FR-011 | T-003 |
| FR-012 | T-003 |
| FR-020 | T-001 |
| FR-021 | T-001 |
| FR-022 | T-001 |
| FR-030 | T-001 |
| FR-031 | T-001 |
| FR-032 | T-001 |
| NFR-001 | T-001 |
| NFR-010 | T-002 |
| NFR-011 | T-002 |
| NFR-012 | T-002 |
