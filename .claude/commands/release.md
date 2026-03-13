---
description: Release a new version of kusa (bump, build, GitHub release, Homebrew tap update)
---

# kusa Release

新しいバージョンをリリースする。引数でバージョンを指定（例: `/release 0.4.0`）。

引数がない場合は、直近の変更内容から semver を判断してユーザーに提案する。

## 手順

### 1. バージョン bump

以下の **3ファイル** のバージョンを更新:

- `package.json` → `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`

### 2. CHANGELOG.md 更新

`CHANGELOG.md` の先頭に新しいセクションを追加。
`git log` で前バージョンからの変更を確認し、Added / Fixed / Changed に分類して記載。
末尾のリンク一覧にも新バージョンを追加。

### 3. コミット + PR マージ

```
git checkout -b release/X.Y.Z
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push -u origin release/X.Y.Z
gh pr create --title "chore: bump version to X.Y.Z" --body "Release X.Y.Z"
gh pr merge --merge
git checkout main && git pull origin main
```

### 4. Tauri ビルド

```
bun run tauri build
```

成功すると以下が生成される:
- `src-tauri/target/release/bundle/macos/kusa.app`
- `src-tauri/target/release/bundle/dmg/kusa_X.Y.Z_aarch64.dmg`

ビルドで `Cargo.lock` や `src-tauri/gen/schemas/` が変更された場合は、ブランチを作って追加コミット → PR → マージ → main に戻る。

### 5. GitHub Release 作成

```
gh release create vX.Y.Z \
  src-tauri/target/release/bundle/dmg/kusa_X.Y.Z_aarch64.dmg \
  --title "vX.Y.Z" \
  --notes "$(cat <<'EOF'
CHANGELOG.md の該当セクションの内容をここに貼る
EOF
)"
```

### 6. Homebrew tap 更新

```sh
# DMG の sha256 を取得
shasum -a 256 src-tauri/target/release/bundle/dmg/kusa_X.Y.Z_aarch64.dmg

# tap リポジトリをクローン（/tmp に）
cd /tmp && rm -rf homebrew-tap-update && gh repo clone kaze-jp/homebrew-tap homebrew-tap-update

# Casks/kusa.rb の version と sha256 arm: を更新
# version "X.Y.Z"
# sha256 arm: "新しいsha256"

# コミット + push
cd /tmp/homebrew-tap-update
git add Casks/kusa.rb
git commit -m "chore: update kusa cask to vX.Y.Z"
git push origin main
```

### 7. ローカル更新

```sh
brew reinstall kaze-jp/tap/kusa
kusa --version  # → kusa X.Y.Z
```

## 注意事項

- `git commit --no-verify` 禁止
- Conventional Commits 形式 (`chore: bump version to X.Y.Z`)
- `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` をコミットに付与
