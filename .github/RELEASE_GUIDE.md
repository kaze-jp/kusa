# Release Guide

## Prerequisites

### Apple Developer Account (for code signing & notarization)

Code signing and notarization are optional for development builds but required for distribution. Without them, macOS Gatekeeper will warn users when opening the app.

### Required GitHub Secrets

Set these in **Settings > Secrets and variables > Actions**:

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_SIGNING_IDENTITY` | Certificate name (e.g., `Developer ID Application: Your Name (TEAMID)`) |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password (not your Apple ID password) |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

## Code Signing Setup

### 1. Export your Developer ID certificate

```sh
# Open Keychain Access, find "Developer ID Application" certificate
# Right-click > Export > save as Certificates.p12
```

### 2. Base64-encode the certificate

```sh
base64 -i Certificates.p12 -o certificate-base64.txt
```

### 3. Create an app-specific password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in > Security > App-Specific Passwords
3. Generate a new password for "kusa-notarization"

### 4. Add secrets to GitHub

Copy each value to the corresponding GitHub secret listed above.

## Release Process

### 1. Update version

Update the version in these files:
- `package.json` (`version` field)
- `src-tauri/tauri.conf.json` (`version` field)
- `src-tauri/Cargo.toml` (`version` field)

### 2. Commit and tag

```sh
git add -A
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### 3. Wait for the release workflow

The GitHub Actions `release.yml` workflow will:
1. Build for macOS arm64 (Apple Silicon) and x86_64 (Intel)
2. Code sign and notarize (if secrets are configured)
3. Create a draft GitHub Release with `.dmg` artifacts

### 4. Review and publish the release

1. Go to the [Releases page](https://github.com/kaze-jp/kusa/releases)
2. Review the draft release
3. Edit release notes if needed
4. Publish the release

### 5. Update the Homebrew formula

After publishing the release:

1. Download the release `.dmg` files
2. Calculate SHA256 hashes:
   ```sh
   shasum -a 256 kusa_X.Y.Z_aarch64.dmg
   shasum -a 256 kusa_X.Y.Z_x64.dmg
   ```
3. Update `Casks/kusa.rb` in the [homebrew-tap](https://github.com/gene/homebrew-tap) repo:
   - Update `version`
   - Update `sha256` for both architectures
4. Commit and push the formula update

## Homebrew Tap Setup (One-time)

### 1. Create the tap repository

Create a new GitHub repository: `gene/homebrew-tap`

### 2. Add the formula

```sh
git clone https://github.com/gene/homebrew-tap.git
cd homebrew-tap
mkdir -p Casks
cp /path/to/kusa/homebrew/kusa.rb Casks/kusa.rb
# Update version and sha256 values
git add Casks/kusa.rb
git commit -m "Add kusa cask formula"
git push
```

### 3. Test the installation

```sh
brew tap gene/tap
brew install gene/tap/kusa
kusa --version
```

## Troubleshooting

### "kusa is damaged and can't be opened"

This means the app is not code signed. Either:
- Set up code signing secrets and rebuild
- Or users can bypass Gatekeeper: `xattr -cr /Applications/kusa.app`

### Notarization fails

- Verify `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` are correct
- Ensure the app-specific password is valid (they can expire)
- Check Apple's notarization status: `xcrun notarytool log <submission-id> --apple-id <email> --password <app-password> --team-id <team-id>`

### Build fails on CI

- Check that Rust toolchain version is compatible
- Verify `pnpm install --frozen-lockfile` succeeds (lockfile in sync)
- Check `cargo check` passes locally before pushing
