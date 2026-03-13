# Feature: smart-tab-label

## Overview
タブにファイル名だけでなく、必要に応じて親ディレクトリ情報を表示し、同名ファイル（README.md等）が複数開かれている場合に区別できるようにする。VS Codeのようなスマートラベル表示。

## Product Context
kusa はターミナルAI開発者向けのMarkdownエディター。複数ファイルタブ機能は実装済みだが、タブラベルがファイル名のみのため、同名ファイルの識別が困難。AI開発では README.md, CLAUDE.md, spec.md 等の同名ファイルが異なるディレクトリに存在することが多く、タブの区別は必須。

## Initial Requirements

### Functional Requirements

FR-001: When 同名ファイルが複数タブで開かれている場合, kusa shall 各タブに親ディレクトリ名を付加して表示する（例: `README.md` → `project/README.md`）

FR-002: When 親ディレクトリ名だけでは区別できない場合（同じ親ディレクトリ名）, kusa shall さらに上位のディレクトリを追加して最小限の区別可能なパスを表示する（例: `src/components/README.md` vs `lib/components/README.md`）

FR-003: When ファイル名が一意の場合, kusa shall ファイル名のみを表示する（現状維持）

FR-004: When タブが開閉された場合, kusa shall 全タブのラベルを再計算して最新の状態を反映する

FR-005: The kusa shall untitled タブやクリップボードタブには親ディレクトリ表示を適用しない

### Non-Functional Requirements

NFR-001: The kusa shall タブラベルの再計算を 1ms 以内に完了する（20タブ上限のため十分高速に）

NFR-002: The kusa shall ディレクトリ部分をファイル名より視覚的に控えめに表示する（薄い色、小さいフォント等）

### Constraints
- 既存の TabBar コンポーネントと tabStore の構造を大きく変更しない
- タブの最大幅 (160px truncate) 内に収める
- ダークテーマのみ考慮

### Assumptions
- ファイルパスは絶対パスで保持されている（tabStore の filePath）
- 同名ファイルの衝突は開いているタブ間でのみ判定する

### Open Questions
- パス区切りのセパレーターは `/` でいい？それとも `›` 等の記号を使う？
- ディレクトリ部分の表示位置はファイル名の前？後？（VS Codeは前に薄く表示）
