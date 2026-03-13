# Requirements: smart-tab-label

## Document Info
- Feature: smart-tab-label
- Status: Draft
- Created: 2026-03-13

## Functional Requirements

### Core Behavior

FR-001: When 同じ fileName を持つタブが2つ以上開かれている場合, kusa shall それらのタブに親ディレクトリ名をファイル名の前に `/` 区切りで付加して表示する

FR-002: When 親ディレクトリ名を1階層付加しても同名タブの区別ができない場合, kusa shall 区別に必要な最小限の上位ディレクトリを追加して表示する

FR-003: When ファイル名が開かれている全タブの中で一意の場合, kusa shall ファイル名のみを表示する

FR-004: The kusa shall ディレクトリ部分を `/` セパレーターで区切り、ファイル名の前に表示する

### Dynamic Recalculation

FR-010: When 新しいタブが開かれた場合, kusa shall 全タブのラベルを再計算する

FR-011: When タブが閉じられた場合, kusa shall 全タブのラベルを再計算する

FR-012: When タブのファイルパスが変更された場合（untitled タブの promote 等）, kusa shall 全タブのラベルを再計算する

### Special Tab Types

FR-020: The kusa shall untitled タブ（isUntitled === true）にはディレクトリ付加を適用しない

FR-021: The kusa shall クリップボードタブにはディレクトリ付加を適用しない

FR-022: The kusa shall filePath が空文字のタブにはディレクトリ付加を適用しない

### Edge Cases

FR-030: When 同名ファイルが同じディレクトリに存在することはないため（filePath が一意）, kusa shall 必ず区別可能なラベルを生成する

FR-031: When タブが1つだけの場合, kusa shall ファイル名のみを表示する

FR-032: When ルートディレクトリ直下のファイルでディレクトリ付加が必要な場合, kusa shall `/` からの相対パスの最小限部分を表示する

## Non-Functional Requirements

### Performance

NFR-001: The kusa shall タブラベルの再計算を 1ms 以内に完了する

### Visual Design

NFR-010: The kusa shall ディレクトリ部分をファイル名より低コントラストの色（zinc-500 等）で表示する

NFR-011: The kusa shall ファイル名部分は現状と同じ色で表示する

NFR-012: The kusa shall ラベル全体がタブの最大幅内に収まらない場合、ディレクトリ部分を優先的に truncate する

## Acceptance Criteria

1. README.md を2つの異なるディレクトリから開いた場合、各タブに親ディレクトリが表示される
2. 片方の README.md を閉じると、残りのタブはファイル名のみの表示に戻る
3. 一意なファイル名のタブにはディレクトリが表示されない
4. untitled タブやクリップボードタブにはディレクトリが表示されない
5. ディレクトリ部分がファイル名部分より控えめな色で表示される

## Traceability

| requirements-init | requirements.md |
|-------------------|-----------------|
| FR-001 | FR-001, FR-004 |
| FR-002 | FR-002 |
| FR-003 | FR-003 |
| FR-004 | FR-010, FR-011, FR-012 |
| FR-005 | FR-020, FR-021, FR-022 |
| NFR-001 | NFR-001 |
| NFR-002 | NFR-010, NFR-011, NFR-012 |
