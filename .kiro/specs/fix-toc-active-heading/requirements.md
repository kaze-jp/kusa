# Requirements Document

## Introduction
TOCパネルのアクティブ見出しハイライトが、スクロール位置に関係なく常に最後の見出しに固定されるバグを修正する。現在の IntersectionObserver ベースの実装を、scroll イベント + `getBoundingClientRect` ベースの追跡に置き換え、すべてのスクロール操作で正確にアクティブ見出しを反映する。

## Requirements

### Requirement 1: スクロール位置に基づくアクティブ見出し追跡
**Objective:** ユーザーとして、プレビューをスクロールした際にTOCで現在読んでいるセクションがハイライトされてほしい。読んでいる位置を常に把握できるようにするため。

#### Acceptance Criteria
1. When ユーザーがプレビューコンテナをスクロールする, the useActiveHeading hook shall コンテナ上端付近を通過した最後の見出しのIDを `activeId` シグナルとして返す
2. When プレビューコンテナが最上部にスクロールされている（どの見出しもまだ通過していない）, the useActiveHeading hook shall 最初の見出しを `activeId` として返す
3. When プレビューコンテナが最下部までスクロールされている, the useActiveHeading hook shall 最後に通過した見出しを `activeId` として返す
4. When `observe()` が呼び出される, the useActiveHeading hook shall 初回の `update()` を即座に実行し、スクロール前でも正しいアクティブ見出しを設定する

### Requirement 2: パフォーマンス
**Objective:** ユーザーとして、TOC追跡によるスクロールのカクつきを感じたくない。スムーズな閲覧体験を維持するため。

#### Acceptance Criteria
1. While ユーザーがスクロール中, the useActiveHeading hook shall `requestAnimationFrame` でスロットリングし、1フレームあたり最大1回の見出し位置計算に抑える
2. The useActiveHeading hook shall scroll イベントリスナーに `{ passive: true }` を指定する

### Requirement 3: ライフサイクル管理
**Objective:** 開発者として、オブザーバーのリソースリークを防ぎたい。安定した動作を維持するため。

#### Acceptance Criteria
1. When `observe()` が新しいコンテナで再呼び出しされる, the useActiveHeading hook shall 既存の scroll イベントリスナーを解除してから新しいリスナーを登録する
2. When コンポーネントがアンマウントされる, the useActiveHeading hook shall `onCleanup` で scroll イベントリスナーを解除する
3. When コンテナ内に見出し要素が存在しない, the useActiveHeading hook shall `activeId` を `null` に設定する

### Requirement 4: コンテンツ変更への追従
**Objective:** ユーザーとして、ファイル変更後もTOCハイライトが正しく動作してほしい。ファイルウォッチでの自動リロード時にも正確な表示を維持するため。

#### Acceptance Criteria
1. When HTMLコンテンツが変更され `observe()` が再呼び出しされる, the useActiveHeading hook shall 新しいDOM内の見出し要素を再取得し、現在のスクロール位置に基づいてアクティブ見出しを正しく設定する
2. When コンテンツ変更後にスクロール位置が保持されている, the useActiveHeading hook shall 変更前と同じセクションの見出しをアクティブにする
